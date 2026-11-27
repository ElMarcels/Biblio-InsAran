import { NextResponse } from "next/server";

import {
  actorInvitationTarget,
  actorMemberData,
  getGroupActor,
  requestedActorType,
} from "@/lib/groups/auth";
import { groupInvitationResponseSchema, MAX_GROUP_MEMBERS } from "@/lib/groups/validation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ invitationId: string }> };

export async function POST(request: Request, context: Context) {
  const actor = await getGroupActor(requestedActorType(request));
  if (!actor) return NextResponse.json({ error: "groups.errors.session" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "groups.errors.invalidData" }, { status: 400 });
  }
  const parsed = groupInvitationResponseSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "groups.errors.invalidData" }, { status: 400 });

  const { invitationId } = await context.params;
  const invitation = await prisma.groupInvitation.findFirst({
    where: {
      id: invitationId,
      status: "PENDING",
      ...actorInvitationTarget(actor),
    },
  });
  if (!invitation) return NextResponse.json({ error: "groups.errors.invitationNotFound" }, { status: 404 });

  try {
    await prisma.$transaction(async (transaction) => {
      const current = await transaction.groupInvitation.findFirst({
        where: {
          id: invitationId,
          status: "PENDING",
          ...actorInvitationTarget(actor),
        },
      });
      if (!current) throw new Error("INVITATION_ALREADY_HANDLED");

      if (parsed.data.decision === "ACCEPTED") {
        const memberCount = await transaction.groupMember.count({ where: { groupId: current.groupId } });
        if (memberCount >= MAX_GROUP_MEMBERS) throw new Error("GROUP_MEMBER_LIMIT");
        const existingMembership = await transaction.groupMember.findFirst({
          where: {
            groupId: current.groupId,
            ...(actor.type === "STAFF" ? { userId: actor.id } : { readerId: actor.id }),
          },
        });
        if (!existingMembership) {
          await transaction.groupMember.create({
            data: {
              groupId: current.groupId,
              ...actorMemberData(actor),
              role: "MEMBER",
            },
          });
        }
      }
      await transaction.groupInvitation.update({
        where: { id: current.id },
        data: { status: parsed.data.decision, respondedAt: new Date() },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "GROUP_MEMBER_LIMIT") {
      return NextResponse.json({ error: "groups.errors.memberLimit" }, { status: 409 });
    }
    if (error instanceof Error && error.message === "INVITATION_ALREADY_HANDLED") {
      return NextResponse.json({ error: "groups.errors.invitationNotFound" }, { status: 409 });
    }
    throw error;
  }

  return NextResponse.json({ ok: true, groupId: invitation.groupId });
}