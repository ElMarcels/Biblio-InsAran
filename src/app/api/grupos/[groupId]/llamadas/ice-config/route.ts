import { NextResponse } from "next/server";

import { getGroupActor, getGroupMembership, requestedActorType } from "@/lib/groups/auth";
import { iceServersSchema } from "@/lib/groups/validation";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ groupId: string }> };

export async function GET(request: Request, context: Context) {
  const actor = await getGroupActor(requestedActorType(request));
  if (!actor) return NextResponse.json({ error: "groups.errors.session" }, { status: 401 });
  const { groupId } = await context.params;
  if (!(await getGroupMembership(groupId, actor))) {
    return NextResponse.json({ error: "groups.errors.groupNotFound" }, { status: 404 });
  }

  const fallback = [{ urls: "stun:stun.l.google.com:19302" }];
  const configured = process.env.WEBRTC_ICE_SERVERS;
  if (!configured) return NextResponse.json({ iceServers: fallback });

  try {
    const parsed = iceServersSchema.safeParse(JSON.parse(configured));
    return NextResponse.json({ iceServers: parsed.success && parsed.data.length > 0 ? parsed.data : fallback });
  } catch {
    return NextResponse.json({ iceServers: fallback });
  }
}