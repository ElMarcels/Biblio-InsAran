import "server-only";

import { getCurrentUser } from "../auth";
import { getCurrentReader } from "../reader-auth";
import { prisma } from "../prisma";

export type GroupActorType = "STAFF" | "READER";

export type GroupActor = {
  type: GroupActorType;
  id: string;
  displayName: string;
};

/** Resolve la identidad solicitada usando su sesión real del servidor. */
export async function getGroupActor(type: GroupActorType): Promise<GroupActor | null> {
  if (type === "STAFF") {
    const user = await getCurrentUser();
    return user ? { type, id: user.id, displayName: user.displayName } : null;
  }

  const reader = await getCurrentReader();
  if (!reader || reader.pinMustChange) return null;
  return { type, id: reader.id, displayName: reader.fullName };
}

export async function getGroupMembership(groupId: string, actor: GroupActor) {
  return prisma.groupMember.findFirst({
    where: {
      groupId,
      ...(actor.type === "STAFF" ? { userId: actor.id } : { readerId: actor.id }),
    },
  });
}

export async function isGroupOwner(groupId: string, actor: GroupActor): Promise<boolean> {
  const membership = await getGroupMembership(groupId, actor);
  return membership?.role === "OWNER";
}

export function actorMemberData(actor: GroupActor) {
  return actor.type === "STAFF"
    ? { userId: actor.id, readerId: null }
    : { userId: null, readerId: actor.id };
}

export function actorInvitationTarget(actor: GroupActor) {
  return actor.type === "STAFF"
    ? { invitedUserId: actor.id, invitedReaderId: null }
    : { invitedUserId: null, invitedReaderId: actor.id };
}

export function actorInvitationSender(actor: GroupActor) {
  return actor.type === "STAFF"
    ? { invitedByUserId: actor.id, invitedByReaderId: null }
    : { invitedByUserId: null, invitedByReaderId: actor.id };
}

export function actorMessageSender(actor: GroupActor) {
  return actor.type === "STAFF"
    ? { senderUserId: actor.id, senderReaderId: null }
    : { senderUserId: null, senderReaderId: actor.id };
}

export function actorCallStarter(actor: GroupActor) {
  return actor.type === "STAFF"
    ? { startedByUserId: actor.id, startedByReaderId: null }
    : { startedByUserId: null, startedByReaderId: actor.id };
}

export function actorCallParticipant(actor: GroupActor) {
  return actor.type === "STAFF"
    ? { userId: actor.id, readerId: null }
    : { userId: null, readerId: actor.id };
}

export function requestedActorType(request: Request): GroupActorType {
  return request.headers.get("x-aranos-actor") === "READER" ? "READER" : "STAFF";
}