import { NextResponse } from "next/server";

import {
  actorCallParticipant,
  getGroupActor,
  getGroupMembership,
  requestedActorType,
} from "@/lib/groups/auth";
import { CALL_PARTICIPANT_TTL_MS, groupCallSignalSchema } from "@/lib/groups/validation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ groupId: string; callId: string }> };

async function authorizedParticipant(
  request: Request,
  groupId: string,
  callId: string,
  connectionId: string,
) {
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
  const params = new URL(request.url).searchParams;
  const connectionId = params.get("connectionId") ?? "";
  const authorization = await authorizedParticipant(request, groupId, callId, connectionId);
  if ("response" in authorization) return authorization.response;

  const sinceValue = Number(params.get("since"));
  const since = Number.isFinite(sinceValue) && sinceValue > 0 ? new Date(sinceValue) : new Date(Date.now() - 10_000);
  const signals = await prisma.groupCallSignal.findMany({
    where: {
      callId,
      toConnectionId: connectionId,
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  return NextResponse.json({
    signals: signals.map((signal) => ({
      id: signal.id,
      fromConnectionId: signal.fromConnectionId,
      type: signal.type,
      payload: JSON.parse(signal.payload) as Record<string, unknown>,
      createdAt: signal.createdAt.getTime(),
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
  const parsed = groupCallSignalSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "groups.errors.invalidSignal" }, { status: 400 });

  let payload: string;
  try {
    payload = JSON.stringify(parsed.data.payload);
  } catch {
    return NextResponse.json({ error: "groups.errors.invalidSignal" }, { status: 400 });
  }
  if (payload.length > 20_000) {
    return NextResponse.json({ error: "groups.errors.signalTooLarge" }, { status: 413 });
  }

  const authorization = await authorizedParticipant(
    request,
    groupId,
    callId,
    parsed.data.connectionId,
  );
  if ("response" in authorization) return authorization.response;

  const target = await prisma.groupCallParticipant.findFirst({
    where: {
      callId,
      connectionId: parsed.data.toConnectionId,
      leftAt: null,
      lastSeenAt: { gte: new Date(Date.now() - CALL_PARTICIPANT_TTL_MS) },
    },
    select: { id: true },
  });
  if (!target || parsed.data.connectionId === parsed.data.toConnectionId) {
    return NextResponse.json({ error: "groups.errors.callPeerNotFound" }, { status: 404 });
  }

  await prisma.groupCallSignal.create({
    data: {
      callId,
      fromConnectionId: parsed.data.connectionId,
      toConnectionId: parsed.data.toConnectionId,
      type: parsed.data.type,
      payload,
    },
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}