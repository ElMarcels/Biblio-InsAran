import { NextResponse } from "next/server";

import {
  actorInvitationSender,
  actorMessageSender,
  getGroupActor,
  getGroupMembership,
  requestedActorType,
} from "@/lib/groups/auth";
import {
  groupInviteSchema,
  groupMessageSchema,
  MAX_GROUP_MEMBERS,
} from "@/lib/groups/validation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ groupId: string }> };

export async function GET(request: Request, context: Context) {
  const actor = await getGroupActor(requestedActorType(request));
  if (!actor) return NextResponse.json({ error: "groups.errors.session" }, { status: 401 });
  const { groupId } = await context.params;
  if (!(await getGroupMembership(groupId, actor))) {
    return NextResponse.json({ error: "groups.errors.groupNotFound" }, { status: 404 });
  }

  const after = new URL(request.url).searchParams.get("after");
  const afterDate = after ? new Date(after) : null;
  const messages = await prisma.groupMessage.findMany({
    where: {
      groupId,
      ...(afterDate && Number.isFinite(afterDate.getTime()) ? { createdAt: { gte: afterDate } } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
  return NextResponse.json({
    messages: messages.map((message) => ({
      id: message.id,
      senderName: message.senderName,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: Request, context: Context) {
  const actor = await getGroupActor(requestedActorType(request));
  if (!actor) return NextResponse.json({ error: "groups.errors.session" }, { status: 401 });
  const { groupId } = await context.params;
  const membership = await getGroupMembership(groupId, actor);
  if (!membership) return NextResponse.json({ error: "groups.errors.groupNotFound" }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "groups.errors.invalidData" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null || !("action" in body)) {
    return NextResponse.json({ error: "groups.errors.invalidData" }, { status: 400 });
  }

  if (body.action === "message") {
    const parsed = groupMessageSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "groups.errors.invalidMessage" }, { status: 400 });

    const message = await prisma.groupMessage.create({
      data: {
        groupId,
        ...actorMessageSender(actor),
        senderName: actor.displayName,
        content: parsed.data.content,
      },
    });
    return NextResponse.json({
      message: {
        id: message.id,
        senderName: message.senderName,
        content: message.content,
        createdAt: message.createdAt.toISOString(),
      },
    }, { status: 201 });
  }

  if (body.action === "invite") {
    if (membership.role !== "OWNER") {
      return NextResponse.json({ error: "groups.errors.ownerOnly" }, { status: 403 });
    }
    const parsed = groupInviteSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "groups.errors.invalidInvite" }, { status: 400 });

    const target = parsed.data.targetType === "STAFF"
      ? await prisma.user.findFirst({ where: { id: parsed.data.targetId, active: true }, select: { id: true } })
      : await prisma.reader.findFirst({ where: { id: parsed.data.targetId, active: true }, select: { id: true } });
    if (!target) return NextResponse.json({ error: "groups.errors.accountNotFound" }, { status: 404 });

    const targetIdentity = parsed.data.targetType === "STAFF"
      ? { userId: target.id }
      : { readerId: target.id };
    if (actor.type === parsed.data.targetType && actor.id === target.id) {
      return NextResponse.json({ error: "groups.errors.selfInvite" }, { status: 400 });
    }
    const [alreadyMember, pendingInvite, memberCount] = await Promise.all([
      prisma.groupMember.findFirst({ where: { groupId, ...targetIdentity } }),
      prisma.groupInvitation.findFirst({
        where: {
          groupId,
          status: "PENDING",
          ...(parsed.data.targetType === "STAFF" ? { invitedUserId: target.id } : { invitedReaderId: target.id }),
        },
      }),
      prisma.groupMember.count({ where: { groupId } }),
    ]);
    if (alreadyMember) return NextResponse.json({ error: "groups.errors.alreadyMember" }, { status: 409 });
    if (pendingInvite) return NextResponse.json({ error: "groups.errors.invitationPending" }, { status: 409 });
    if (memberCount >= MAX_GROUP_MEMBERS) {
      return NextResponse.json({ error: "groups.errors.memberLimit" }, { status: 409 });
    }

    await prisma.groupInvitation.create({
      data: {
        groupId,
        ...actorInvitationSender(actor),
        invitedByName: actor.displayName,
        ...(parsed.data.targetType === "STAFF"
          ? { invitedUserId: target.id }
          : { invitedReaderId: target.id }),
      },
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  return NextResponse.json({ error: "groups.errors.invalidData" }, { status: 400 });
}