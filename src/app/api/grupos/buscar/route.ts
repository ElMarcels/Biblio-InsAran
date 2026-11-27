import { NextResponse } from "next/server";

import { getGroupActor, getGroupMembership, isGroupOwner, requestedActorType } from "@/lib/groups/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const actor = await getGroupActor(requestedActorType(request));
  if (!actor) return NextResponse.json({ error: "groups.errors.session" }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const query = params.get("q")?.trim() ?? "";
  const groupId = params.get("groupId") ?? "";
  if (query.length < 2 || query.length > 80 || !groupId) {
    return NextResponse.json({ results: [] });
  }
  if (!(await isGroupOwner(groupId, actor))) {
    return NextResponse.json({ error: "groups.errors.ownerOnly" }, { status: 403 });
  }

  const membership = await getGroupMembership(groupId, actor);
  if (!membership) return NextResponse.json({ error: "groups.errors.groupNotFound" }, { status: 404 });

  const [members, pending] = await Promise.all([
    prisma.groupMember.findMany({
      where: { groupId },
      select: { userId: true, readerId: true },
    }),
    prisma.groupInvitation.findMany({
      where: { groupId, status: "PENDING" },
      select: { invitedUserId: true, invitedReaderId: true },
    }),
  ]);
  const excludedUsers = [
    ...members.flatMap((member) => (member.userId ? [member.userId] : [])),
    ...pending.flatMap((invite) => (invite.invitedUserId ? [invite.invitedUserId] : [])),
  ];
  const excludedReaders = [
    ...members.flatMap((member) => (member.readerId ? [member.readerId] : [])),
    ...pending.flatMap((invite) => (invite.invitedReaderId ? [invite.invitedReaderId] : [])),
  ];
  const normalized = query.toLocaleUpperCase("es");

  const [users, readers] = await Promise.all([
    prisma.user.findMany({
      where: {
        active: true,
        id: { notIn: excludedUsers },
        OR: [
          { username: { contains: query, mode: "insensitive" } },
          { displayName: { contains: query, mode: "insensitive" } },
        ],
      },
      select: { id: true, username: true, displayName: true },
      take: 8,
      orderBy: { displayName: "asc" },
    }),
    prisma.reader.findMany({
      where: {
        active: true,
        id: { notIn: excludedReaders },
        OR: [
          { cardNumber: { startsWith: normalized } },
          { fullName: { contains: query, mode: "insensitive" } },
        ],
      },
      select: { id: true, fullName: true },
      take: 8,
      orderBy: { fullName: "asc" },
    }),
  ]);

  const results = [
    ...users
      .filter((user) => !(actor.type === "STAFF" && user.id === actor.id))
      .map((user) => ({ id: user.id, type: "STAFF" as const, name: user.displayName, account: user.username })),
    ...readers
      .filter((reader) => !(actor.type === "READER" && reader.id === actor.id))
      .map((reader) => ({ id: reader.id, type: "READER" as const, name: reader.fullName, account: "" })),
  ].slice(0, 10);

  return NextResponse.json({ results });
}