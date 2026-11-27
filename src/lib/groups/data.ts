import "server-only";

import { prisma } from "../prisma";
import { actorInvitationTarget, type GroupActor } from "./auth";

function identityWhere(actor: GroupActor) {
  return actor.type === "STAFF" ? { userId: actor.id } : { readerId: actor.id };
}

export async function getGroupHubData(actor: GroupActor) {
  const [memberships, invitations] = await Promise.all([
    prisma.groupMember.findMany({
      where: identityWhere(actor),
      orderBy: { joinedAt: "desc" },
      include: {
        group: {
          include: {
            _count: { select: { members: true } },
            messages: { orderBy: { createdAt: "desc" }, take: 1 },
          },
        },
      },
    }),
    prisma.groupInvitation.findMany({
      where: { ...actorInvitationTarget(actor), status: "PENDING" },
      orderBy: { createdAt: "desc" },
      include: { group: { select: { id: true, name: true } } },
    }),
  ]);

  return {
    groups: memberships.map(({ group, role }) => ({
      id: group.id,
      name: group.name,
      description: group.description,
      role,
      memberCount: group._count.members,
      lastMessage: group.messages[0]?.content ?? null,
      createdAt: group.createdAt.toISOString(),
    })),
    invitations: invitations.map((invitation) => ({
      id: invitation.id,
      groupId: invitation.groupId,
      groupName: invitation.group.name,
      invitedByName: invitation.invitedByName,
      createdAt: invitation.createdAt.toISOString(),
    })),
  };
}

export async function getGroupRoomData(groupId: string, actor: GroupActor) {
  const membership = await prisma.groupMember.findFirst({
    where: { groupId, ...identityWhere(actor) },
  });
  if (!membership) return null;

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        orderBy: { joinedAt: "asc" },
        include: {
          user: { select: { displayName: true } },
          reader: { select: { fullName: true } },
        },
      },
      messages: { orderBy: { createdAt: "desc" }, take: 50 },
      invitations: {
        where: { status: "PENDING" },
        orderBy: { createdAt: "desc" },
        include: {
          invitedUser: { select: { displayName: true, username: true } },
          invitedReader: { select: { fullName: true, cardNumber: true } },
        },
      },
    },
  });
  if (!group) return null;

  return {
    group: {
      id: group.id,
      name: group.name,
      description: group.description,
      createdAt: group.createdAt.toISOString(),
    },
    role: membership.role,
    members: group.members.map((member) => ({
      id: member.id,
      name: member.user?.displayName ?? member.reader?.fullName ?? "",
      role: member.role,
      joinedAt: member.joinedAt.toISOString(),
    })),
    pendingInvitations: group.invitations.map((invitation) => ({
      id: invitation.id,
      name:
        invitation.invitedUser?.displayName ??
        invitation.invitedReader?.fullName ??
        invitation.invitedUser?.username ??
        invitation.invitedReader?.cardNumber ??
        "",
      createdAt: invitation.createdAt.toISOString(),
    })),
    messages: group.messages.reverse().map((message) => ({
      id: message.id,
      senderName: message.senderName,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
    })),
  };
}