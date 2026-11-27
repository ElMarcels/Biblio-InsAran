import { NextResponse } from "next/server";

import { actorMemberData, getGroupActor, requestedActorType } from "@/lib/groups/auth";
import { groupCreateSchema, MAX_GROUPS_PER_OWNER } from "@/lib/groups/validation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const actor = await getGroupActor(requestedActorType(request));
  if (!actor) return NextResponse.json({ error: "groups.errors.session" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "groups.errors.invalidData" }, { status: 400 });
  }
  const parsed = groupCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "groups.errors.invalidGroup" }, { status: 400 });
  }

  const ownerWhere = actor.type === "STAFF" ? { userId: actor.id } : { readerId: actor.id };
  const ownedCount = await prisma.groupMember.count({
    where: { ...ownerWhere, role: "OWNER" },
  });
  if (ownedCount >= MAX_GROUPS_PER_OWNER) {
    return NextResponse.json({ error: "groups.errors.groupLimit" }, { status: 409 });
  }

  const group = await prisma.group.create({
    data: {
      ...parsed.data,
      members: {
        create: { ...actorMemberData(actor), role: "OWNER" },
      },
    },
    select: { id: true },
  });

  return NextResponse.json({ id: group.id }, { status: 201 });
}