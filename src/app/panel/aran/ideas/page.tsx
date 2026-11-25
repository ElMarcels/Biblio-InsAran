import { AranIdeaForm } from "@/components/forms/AranIdeaForm";
import { AranIdeaStatusForm } from "@/components/panel/AranIdeaStatusForm";
import { PageTransition } from "@/components/PageTransition";
import { isManagerRole, requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import type { TranslationKey } from "@/lib/i18n/translate";
import { prisma } from "@/lib/prisma";
import type { AranIdeaStatus } from "@/lib/validation";

const STATUS_LABELS: Record<AranIdeaStatus, TranslationKey> = {
  NEW: "panel.aran.status.NEW",
  REVIEWING: "panel.aran.status.REVIEWING",
  PLANNED: "panel.aran.status.PLANNED",
  REJECTED: "panel.aran.status.REJECTED",
  IMPLEMENTED: "panel.aran.status.IMPLEMENTED",
};

export async function generateMetadata() {
  const t = await getT();
  return { title: t("panel.aran.ideasTitle") };
}

export default async function AranIdeasPage() {
  const user = await requireUser();
  const manager = isManagerRole(user.role);
  const [t, ideas] = await Promise.all([
    getT(),
    manager
      ? prisma.aranIdea.findMany({
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          include: { createdBy: { select: { displayName: true } } },
        })
      : Promise.resolve([]),
  ]);

  return (
    <PageTransition>
      <div className="grid gap-8 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="flex flex-col gap-5">
          <header>
            <p className="micro mb-1.5">ARAN</p>
            <h2 className="font-display text-[26px] font-bold">
              {t("panel.aran.ideasTitle")}
            </h2>
            <p className="mt-1.5 text-[14px] text-ink-soft">
              {t("panel.aran.ideasLead")}
            </p>
          </header>
          <div className="border-2 border-line bg-surface p-6">
            <AranIdeaForm />
          </div>
        </section>

        {manager ? (
          <section className="flex flex-col gap-4" aria-labelledby="aran-ideas-inbox">
            <header>
              <h3 id="aran-ideas-inbox" className="font-display text-[21px] font-bold">
                {t("panel.aran.inboxTitle")}
              </h3>
              <p className="mt-1 text-[13px] text-ink-faint">
                {t("panel.aran.inboxDescription", { n: ideas.length })}
              </p>
            </header>
            {ideas.length === 0 ? (
              <p className="border-2 border-line bg-surface p-5 text-[14px] text-ink-faint">
                {t("panel.aran.noIdeas")}
              </p>
            ) : (
              <ul className="flex flex-col gap-4">
                {ideas.map((idea) => (
                  <li key={idea.id} className="border-2 border-line bg-surface p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="font-display text-[17px] font-bold">{idea.title}</h4>
                        <p className="mt-1 text-[12px] text-ink-faint">
                          {t("panel.aran.submittedBy", {
                            name: idea.createdBy?.displayName ?? t("panel.aran.unknownAuthor"),
                            date: formatDate(idea.createdAt),
                          })}
                        </p>
                      </div>
                      <span className="tag-muted">{t(STATUS_LABELS[idea.status])}</span>
                    </div>
                    <p className="mt-4 whitespace-pre-wrap text-[14px] leading-relaxed text-ink-soft">
                      {idea.description}
                    </p>
                    <div className="mt-4 border-t border-hairline pt-4">
                      <AranIdeaStatusForm id={idea.id} status={idea.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}
      </div>
    </PageTransition>
  );
}