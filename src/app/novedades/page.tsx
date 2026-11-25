import { PageTransition } from "@/components/PageTransition";
import { formatDate } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";
import type { DigitalResourceType } from "@/lib/validation";
import type { TranslationKey } from "@/lib/i18n/translate";

const TYPE_LABELS: Record<DigitalResourceType, TranslationKey> = {
  AUDIOBOOK: "digitalResources.type.AUDIOBOOK",
  PDF: "digitalResources.type.PDF",
  EBOOK: "digitalResources.type.EBOOK",
  LINK: "digitalResources.type.LINK",
};

export async function generateMetadata() {
  const t = await getT();
  return { title: t("news.title") };
}

export default async function NewsPage() {
  const [t, books, resources] = await Promise.all([
    getT(),
    prisma.book.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 12,
      select: { id: true, title: true, author: true, description: true, createdAt: true },
    }),
    prisma.digitalResource.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 12,
      select: {
        id: true,
        title: true,
        author: true,
        type: true,
        url: true,
        description: true,
        createdAt: true,
      },
    }),
  ]);
  const items = [
    ...books.map((book) => ({ ...book, kind: "book" as const })),
    ...resources.map((resource) => ({ ...resource, kind: "resource" as const })),
  ]
    .sort(
      (a, b) =>
        b.createdAt.getTime() - a.createdAt.getTime() || a.id.localeCompare(b.id),
    )
    .slice(0, 12);

  return (
    <PageTransition>
      <div className="shell flex flex-1 flex-col py-10">
        <header className="mb-8 animate-fade-in-up">
          <p className="micro mb-3">{t("assistant.name")}</p>
          <h1 className="font-display text-[30px] font-bold sm:text-[38px]">
            {t("news.title")}
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] text-ink-soft">
            {t("news.intro")}
          </p>
        </header>

        {items.length === 0 ? (
          <p className="border-2 border-line bg-surface p-5 text-[14px] text-ink-faint">
            {t("news.empty")}
          </p>
        ) : (
          <div className="grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <article
                key={`${item.kind}-${item.id}`}
                className="flex flex-col border-2 border-line bg-surface p-5"
              >
                <p className="micro mb-2">
                  {formatDate(item.createdAt)} · {item.kind === "book"
                    ? t("news.book")
                    : `${t("news.digitalResource")} · ${t(TYPE_LABELS[item.type])}`}
                </p>
                <h2 className="font-display text-[21px] font-bold leading-snug">
                  {item.title}
                </h2>
                {item.author ? (
                  <p className="mt-1 text-[13px] text-ink-faint">{item.author}</p>
                ) : null}
                {item.description ? (
                  <p className="mt-4 flex-1 text-[14px] leading-relaxed text-ink-soft">
                    {item.description}
                  </p>
                ) : (
                  <div className="flex-1" />
                )}
                <div className="mt-5 border-t border-hairline pt-4">
                  {item.kind === "book" ? (
                    <a href={`/libro/${item.id}`} className="btn-primary btn-sm">
                      {t("news.openBook")}
                    </a>
                  ) : (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary btn-sm"
                    >
                      {t("news.openResource")}
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}