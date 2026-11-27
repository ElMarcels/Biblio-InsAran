import { notFound } from "next/navigation";

import { PageTransition } from "@/components/PageTransition";
import { GroupRoom } from "@/components/groups/GroupRoom";
import { getGroupActor } from "@/lib/groups/auth";
import { getGroupRoomData } from "@/lib/groups/data";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("groups.title") };
}

export default async function GroupPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  await requireUser();
  const { groupId } = await params;
  const actor = await getGroupActor("STAFF");
  if (!actor) notFound();
  const data = await getGroupRoomData(groupId, actor);
  if (!data) notFound();

  return (
    <PageTransition>
      <div className="shell py-9">
        <GroupRoom
          actorType="STAFF"
          basePath="/grupos"
          group={data.group}
          role={data.role}
          members={data.members}
          pendingInvitations={data.pendingInvitations}
          initialMessages={data.messages}
        />
      </div>
    </PageTransition>
  );
}