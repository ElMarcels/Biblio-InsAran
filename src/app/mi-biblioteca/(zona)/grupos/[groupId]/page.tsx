import { notFound } from "next/navigation";

import { GroupRoom } from "@/components/groups/GroupRoom";
import { PageTransition } from "@/components/PageTransition";
import { getGroupActor } from "@/lib/groups/auth";
import { getGroupRoomData } from "@/lib/groups/data";
import { getT } from "@/lib/i18n/server";
import { requireReader } from "@/lib/reader-auth";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("groups.title") };
}

export default async function ReaderGroupPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  await requireReader();
  const { groupId } = await params;
  const actor = await getGroupActor("READER");
  if (!actor) notFound();
  const data = await getGroupRoomData(groupId, actor);
  if (!data) notFound();

  return (
    <PageTransition>
      <GroupRoom
        actorType="READER"
        basePath="/mi-biblioteca/grupos"
        group={data.group}
        role={data.role}
        members={data.members}
        pendingInvitations={data.pendingInvitations}
        initialMessages={data.messages}
      />
    </PageTransition>
  );
}