import { notFound } from "next/navigation";

import { PageTransition } from "@/components/PageTransition";
import { GroupHub } from "@/components/groups/GroupHub";
import { requireUser } from "@/lib/auth";
import { getGroupActor } from "@/lib/groups/auth";
import { getGroupHubData } from "@/lib/groups/data";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("groups.title") };
}

export default async function GroupsPage() {
  await requireUser();
  const actor = await getGroupActor("STAFF");
  if (!actor) notFound();
  const data = await getGroupHubData(actor);

  return (
    <PageTransition>
      <div className="shell py-9">
        <GroupHub actorType="STAFF" basePath="/grupos" groups={data.groups} invitations={data.invitations} />
      </div>
    </PageTransition>
  );
}