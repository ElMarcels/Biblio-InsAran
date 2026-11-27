import { notFound } from "next/navigation";

import { GroupHub } from "@/components/groups/GroupHub";
import { PageTransition } from "@/components/PageTransition";
import { getGroupHubData } from "@/lib/groups/data";
import { getGroupActor } from "@/lib/groups/auth";
import { getT } from "@/lib/i18n/server";
import { requireReader } from "@/lib/reader-auth";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("groups.title") };
}

export default async function ReaderGroupsPage() {
  await requireReader();
  const actor = await getGroupActor("READER");
  if (!actor) notFound();
  const data = await getGroupHubData(actor);

  return (
    <PageTransition>
      <GroupHub
        actorType="READER"
        basePath="/mi-biblioteca/grupos"
        groups={data.groups}
        invitations={data.invitations}
      />
    </PageTransition>
  );
}