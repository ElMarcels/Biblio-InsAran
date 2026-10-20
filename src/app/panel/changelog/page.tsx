import { ChangelogPublishForm } from "@/components/ChangelogPublishForm";
import { DeleteChangelogButton } from "@/components/DeleteChangelogButton";
import { PageTransition } from "@/components/PageTransition";
import { requireManager } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";

type Params = Promise<Record<string, string | string[] | undefined>>;

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata() {
  const t = await getT();
  return { title: t("panel.changelog.novedades") };
}

export default async function ChangelogPage({ searchParams }: { searchParams: Params }) {
  const [t, aviso] = await Promise.all([
    getT(),
    searchParams.then((params) => one(params.aviso)),
  ]);

  await requireManager();

  const changelogs = await prisma.changelog.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { displayName: true } },
      _count: { select: { views: true } },
    },
  });

  return (
    <PageTransition>
      <div className="flex flex-col gap-8">
        <header>
          <h2 className="font-display text-[26px] font-bold">
            {t("panel.changelog.novedadesDeLaPlataforma")}
          </h2>
          <p className="mt-1.5 max-w-2xl text-[14px] text-ink-soft">
            {t("panel.changelog.explicacion")}
          </p>
        </header>

        {aviso === "publicada" ? (
          <p className="animate-pop text-[13px] font-semibold text-ok">
            {t("panel.changelog.publicada")}
          </p>
        ) : null}

        <section className="grid gap-8 lg:grid-cols-[1fr_1.5fr]">
          <div className="border-2 border-line bg-surface p-6">
            <h3 className="font-display text-[19px] font-bold">
              {t("panel.changelog.publicarNueva")}
            </h3>
            <p className="mt-1 mb-5 text-[13px] text-ink-faint">
              {t("panel.changelog.seMostraraUnaVez")}
            </p>
            <ChangelogPublishForm />
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="font-display text-[19px] font-bold">
              {t("panel.changelog.publicadasN", { n: changelogs.length })}
            </h3>

            {changelogs.length === 0 ? (
              <p className="border-2 border-line bg-surface p-5 text-[14px] text-ink-faint">
                {t("panel.changelog.sinNovedades")}
              </p>
            ) : (
              <ul className="flex flex-col gap-4">
                {changelogs.map((item) => (
                  <li
                    key={item.id}
                    className="animate-fade-in-up border-2 border-line bg-surface p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="font-display text-[17px] font-bold">{item.title}</h4>
                        <p className="mt-1 text-[12px] text-ink-faint">
                          {t("panel.changelog.publicadaElDate", {
                            date: formatDate(item.createdAt),
                          })}
                          {item.createdBy
                            ? ` · ${t("panel.changelog.porName", {
                                name: item.createdBy.displayName,
                              })}`
                            : ""}
                        </p>
                      </div>
                      <DeleteChangelogButton id={item.id} title={item.title} />
                    </div>

                    <p className="mt-3 border-t border-hairline pt-3 text-[13px] text-ink-faint">
                      {t(
                        item._count.views === 1
                          ? "panel.changelog.leidaPorUna"
                          : "panel.changelog.leidaPorN",
                        { n: item._count.views },
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </PageTransition>
  );
}
