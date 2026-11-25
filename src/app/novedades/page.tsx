import { PageTransition } from "@/components/PageTransition";
import { Markdown } from "@/components/Markdown";
import { formatDate } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("news.title") };
}

export default async function NewsPage() {
  const [t, items] = await Promise.all([
    getT(),
    prisma.changelog.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, body: true, createdAt: true },
    }),
  ]);

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
          <div className="flex max-w-4xl flex-col gap-5">
            {items.map((item) => (
              <article
                key={item.id}
                className="animate-fade-in-up border-2 border-line bg-surface p-5 sm:p-7"
              >
                <p className="micro mb-2">{formatDate(item.createdAt)}</p>
                <h2 className="font-display text-[21px] font-bold">{item.title}</h2>
                <div className="mt-4 border-t border-hairline pt-4">
                  <Markdown>{item.body}</Markdown>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}