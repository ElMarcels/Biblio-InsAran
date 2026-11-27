import { NextResponse } from "next/server";

import {
  actorCallParticipant,
  getGroupActor,
  getGroupMembership,
  requestedActorType,
} from "@/lib/groups/auth";
import {
  CALL_PARTICIPANT_TTL_MS,
  groupCallBoardActionSchema,
  MAX_GROUP_CALL_BOARD_EVENTS,
} from "@/lib/groups/validation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ groupId: string; callId: string }> };

async function authorizeParticipant(request: Request, groupId: string, callId: string, connectionId: string) {
  const actor = await getGroupActor(requestedActorType(request));
  if (!actor) return { response: NextResponse.json({ error: "groups.errors.session" }, { status: 401 }) };
  if (!(await getGroupMembership(groupId, actor))) {
    return { response: NextResponse.json({ error: "groups.errors.groupNotFound" }, { status: 404 }) };
  }
  const call = await prisma.groupCall.findFirst({ where: { id: callId, groupId, endedAt: null } });
  if (!call) return { response: NextResponse.json({ error: "groups.errors.callEnded" }, { status: 404 }) };
  const participant = await prisma.groupCallParticipant.findFirst({
    where: {
      callId,
      connectionId,
      ...actorCallParticipant(actor),
      leftAt: null,
      lastSeenAt: { gte: new Date(Date.now() - CALL_PARTICIPANT_TTL_MS) },
    },
  });
  if (!participant) {
    return { response: NextResponse.json({ error: "groups.errors.notInCall" }, { status: 403 }) };
  }
  return { actor, participant };
}

export async function GET(request: Request, context: Context) {
  const { groupId, callId } = await context.params;
  const connectionId = new URL(request.url).searchParams.get("connectionId") ?? "";
  const authorization = await authorizeParticipant(request, groupId, callId, connectionId);
  if ("response" in authorization) return authorization.response;

  const events = await prisma.groupCallBoardEvent.findMany({
    where: { callId },
    orderBy: { position: "asc" },
    take: MAX_GROUP_CALL_BOARD_EVENTS,
    select: { id: true, senderName: true, payload: true },
  });
  return NextResponse.json({
    events: events.map((event) => ({
      id: event.id,
      senderName: event.senderName,
      ...JSON.parse(event.payload),
    })),
  });
}

export async function POST(request: Request, context: Context) {
  const { groupId, callId } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "groups.errors.invalidData" }, { status: 400 });
  }
  const parsed = groupCallBoardActionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "groups.errors.invalidBoardEvent" }, { status: 400 });

  const authorization = await authorizeParticipant(request, groupId, callId, parsed.data.connectionId);
  if ("response" in authorization) return authorization.response;

  if (parsed.data.action === "clear") {
    await prisma.groupCallBoardEvent.deleteMany({ where: { callId } });
    return NextResponse.json({ ok: true });
  }

  const eventCount = await prisma.groupCallBoardEvent.count({ where: { callId } });
  if (eventCount >= MAX_GROUP_CALL_BOARD_EVENTS) {
    return NextResponse.json({ error: "groups.errors.boardFull" }, { status: 409 });
  }

  const stroke = {
    color: parsed.data.color,
    width: parsed.data.width,
    erase: parsed.data.erase,
    points: parsed.data.points,
  };
  const payload = JSON.stringify(stroke);
  if (payload.length > 10_000) {
    return NextResponse.json({ error: "groups.errors.boardEventTooLarge" }, { status: 413 });
  }

  await prisma.groupCallBoardEvent.create({
    data: {
      callId,
      senderConnectionId: parsed.data.connectionId,
      senderName: authorization.actor.displayName,
      payload,
    },
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}