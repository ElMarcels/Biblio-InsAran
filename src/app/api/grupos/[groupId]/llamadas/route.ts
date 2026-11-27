import { NextResponse } from "next/server";

import {
  actorCallParticipant,
  actorCallStarter,
  getGroupActor,
  getGroupMembership,
  requestedActorType,
} from "@/lib/groups/auth";
import {
  CALL_PARTICIPANT_TTL_MS,
  groupCallActionSchema,
  MAX_VOICE_PARTICIPANTS,
} from "@/lib/groups/validation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ groupId: string }> };

async function activeParticipants(callId: string) {
  return prisma.groupCallParticipant.findMany({
    where: {
      callId,
      leftAt: null,
      lastSeenAt: { gte: new Date(Date.now() - CALL_PARTICIPANT_TTL_MS) },
    },
    select: { connectionId: true, displayName: true, raisedHandAt: true },
    orderBy: { joinedAt: "asc" },
  });
}

async function currentCall(groupId: string) {
  const call = await prisma.groupCall.findFirst({
    where: { groupId, endedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!call) return null;

  const participants = await activeParticipants(call.id);
  if (participants.length === 0 && Date.now() - call.createdAt.getTime() > CALL_PARTICIPANT_TTL_MS) {
    await prisma.groupCall.updateMany({
      where: { id: call.id, endedAt: null },
      data: { endedAt: new Date() },
    });
    await prisma.groupCallSignal.deleteMany({ where: { callId: call.id } });
    await prisma.groupCallBoardEvent.deleteMany({ where: { callId: call.id } });
    return null;
  }
  return { call, participants };
}

export async function GET(request: Request, context: Context) {
  const actor = await getGroupActor(requestedActorType(request));
  if (!actor) return NextResponse.json({ error: "groups.errors.session" }, { status: 401 });
  const { groupId } = await context.params;
  if (!(await getGroupMembership(groupId, actor))) {
    return NextResponse.json({ error: "groups.errors.groupNotFound" }, { status: 404 });
  }

  const active = await currentCall(groupId);
  if (!active) return NextResponse.json({ call: null });

  return NextResponse.json({
    call: {
      id: active.call.id,
      startedByName: active.call.startedByName,
      isStarter:
        (actor.type === "STAFF" && active.call.startedByUserId === actor.id) ||
        (actor.type === "READER" && active.call.startedByReaderId === actor.id),
      videoEnabled: active.call.videoEnabled,
      participants: active.participants,
      createdAt: active.call.createdAt.toISOString(),
    },
  });
}

export async function POST(request: Request, context: Context) {
  const actor = await getGroupActor(requestedActorType(request));
  if (!actor) return NextResponse.json({ error: "groups.errors.session" }, { status: 401 });
  const { groupId } = await context.params;
  if (!(await getGroupMembership(groupId, actor))) {
    return NextResponse.json({ error: "groups.errors.groupNotFound" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "groups.errors.invalidData" }, { status: 400 });
  }
  const parsed = groupCallActionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "groups.errors.invalidCall" }, { status: 400 });

  const { action, callId, connectionId, videoEnabled } = parsed.data;
  const now = new Date();
  const actorParticipant = actorCallParticipant(actor);

  if (action === "start") {
    const existing = await currentCall(groupId);
    if (existing) {
      return NextResponse.json({
        error: "groups.errors.callAlreadyActive",
        callId: existing.call.id,
      }, { status: 409 });
    }
    const call = await prisma.$transaction(async (transaction) => {
      const created = await transaction.groupCall.create({
        data: {
          groupId,
          ...actorCallStarter(actor),
          startedByName: actor.displayName,
          videoEnabled,
        },
      });
      await transaction.groupCallParticipant.create({
        data: {
          callId: created.id,
          connectionId,
          ...actorParticipant,
          displayName: actor.displayName,
        },
      });
      return created;
    });
    return NextResponse.json({ callId: call.id }, { status: 201 });
  }

  if (!callId) return NextResponse.json({ error: "groups.errors.invalidCall" }, { status: 400 });
  const call = await prisma.groupCall.findFirst({ where: { id: callId, groupId, endedAt: null } });
  if (!call) return NextResponse.json({ error: "groups.errors.callEnded" }, { status: 404 });

  if (action === "join" || action === "heartbeat") {
    const existingParticipant = await prisma.groupCallParticipant.findUnique({
      where: { callId_connectionId: { callId, connectionId } },
    });
    if (
      existingParticipant &&
      (existingParticipant.userId !== (actor.type === "STAFF" ? actor.id : null) ||
        existingParticipant.readerId !== (actor.type === "READER" ? actor.id : null))
    ) {
      return NextResponse.json({ error: "groups.errors.notInCall" }, { status: 403 });
    }
    const activeSince = new Date(Date.now() - CALL_PARTICIPANT_TTL_MS);
    const participantIsActive = Boolean(
      existingParticipant &&
        !existingParticipant.leftAt &&
        existingParticipant.lastSeenAt >= activeSince,
    );
    if (action === "heartbeat" && !participantIsActive) {
      return NextResponse.json({ error: "groups.errors.notInCall" }, { status: 403 });
    }
    if (action === "join" && !participantIsActive) {
      const participants = await activeParticipants(callId);
      if (participants.length >= MAX_VOICE_PARTICIPANTS) {
        return NextResponse.json({ error: "groups.errors.voiceFull" }, { status: 409 });
      }
    }

    if (action === "heartbeat") {
      await prisma.groupCallParticipant.update({
        where: { id: existingParticipant!.id },
        data: { lastSeenAt: now },
      });
      return NextResponse.json({ callId });
    }

    await prisma.groupCallParticipant.upsert({
      where: { callId_connectionId: { callId, connectionId } },
      create: {
        callId,
        connectionId,
        ...actorParticipant,
        displayName: actor.displayName,
        lastSeenAt: now,
      },
      update: {
        ...actorParticipant,
        displayName: actor.displayName,
        lastSeenAt: now,
        leftAt: null,
        raisedHandAt: null,
      },
    });
    return NextResponse.json({ callId });
  }

  const participant = await prisma.groupCallParticipant.findFirst({
    where: {
      callId,
      connectionId,
      ...actorParticipant,
      leftAt: null,
      lastSeenAt: { gte: new Date(Date.now() - CALL_PARTICIPANT_TTL_MS) },
    },
  });
  if (!participant) return NextResponse.json({ error: "groups.errors.notInCall" }, { status: 403 });

  if (action === "raiseHand" || action === "lowerHand") {
    await prisma.groupCallParticipant.update({
      where: { id: participant.id },
      data: { raisedHandAt: action === "raiseHand" ? now : null },
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "leave") {
    await prisma.groupCallParticipant.update({
      where: { id: participant.id },
      data: { leftAt: now, raisedHandAt: null },
    });
    return NextResponse.json({ ok: true });
  }

  const isStarter =
    (actor.type === "STAFF" && call.startedByUserId === actor.id) ||
    (actor.type === "READER" && call.startedByReaderId === actor.id);
  if (!isStarter) return NextResponse.json({ error: "groups.errors.starterOnly" }, { status: 403 });

  await prisma.groupCall.update({ where: { id: callId }, data: { endedAt: now } });
  await prisma.groupCallParticipant.updateMany({
    where: { callId, leftAt: null },
    data: { leftAt: now, raisedHandAt: null },
  });
  await prisma.groupCallSignal.deleteMany({ where: { callId } });
  await prisma.groupCallBoardEvent.deleteMany({ where: { callId } });
  return NextResponse.json({ ok: true });
}