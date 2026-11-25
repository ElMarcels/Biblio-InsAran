import Link from "next/link";

import { EmptyState } from "@/components/EmptyState";
import { PageTransition } from "@/components/PageTransition";
import { Reveal } from "@/components/Reveal";
import type { DigitalResourceType } from "@/lib/validation";
import { getT } from "@/lib/i18n/server";
import type { TranslationKey } from "@/lib/i18n/translate";
import { prisma } from "@/lib/prisma";

const TYPE_LABELS: Record<DigitalResourceType, TranslationKey> = {
  AUDIOBOOK: "digitalResources.type.AUDIOBOOK",
  PDF: "digitalResources.type.PDF",
  EBOOK: "digitalResources.type.EBOOK",
  LINK: "digitalResources.type.LINK",
};

export async function generateMetadata() {
  const t = await getT();
  return { title: t("digitalResources.title") };
}

export default async function DigitalResourcesPage() {
  const [t, resources] = await Promise.all([
    getT(),
    prisma.digitalResource.findMany({ orderBy: [{ createdAt: "desc" }, { title: "asc" }] }),
  ]);

  return (
    <PageTransition>
      <div className="shell flex flex-1 flex-col py-10">
        <header className="mb-8 animate-fade-in-up">
          <p className="micro mb-3">{t("digitalResources.title")}</p>
          <h1 className="font-display text-[28px] sm:text-[38px] lg:text-[44px]">
            {t("digitalResources.heading")}
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] text-ink-soft">
            {t("digitalResources.description")}
          </p>
        </header>

        {resources.length === 0 ? (
          <EmptyState
            title={t("digitalResources.emptyTitle")}
            description={t("digitalResources.emptyDescription")}
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {resources.map((resource, index) => (
              <Reveal key={resource.id} delay={index * 50}>
                <li className="flex h-full flex-col border-2 border-line bg-surface p-5 transition-[transform,box-shadow] duration-150 hover:-translate-y-[2px] hover:shadow-[6px_6px_0_0_var(--color-line)]">
                  <p className="micro mb-3">{t(TYPE_LABELS[resource.type])}</p>
                  <h2 className="font-display text-[21px] font-bold leading-snug">
                    {resource.title}
                  </h2>
                  {resource.author ? (
                    <p className="mt-1 text-[13px] text-ink-faint">{resource.author}</p>
                  ) : null}
                  {resource.description ? (
                    <p className="mt-4 flex-1 text-[14px] leading-relaxed text-ink-soft">
                      {resource.description}
                    </p>
                  ) : (
                    <div className="flex-1" />
                  )}
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-4">
                    {resource.language ? (
                      <span className="text-[12px] text-ink-faint">
                        {t("digitalResources.language")}: {resource.language}
                      </span>
                    ) : <span />}
                    <Link
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary btn-sm"
                    >
                      {t("digitalResources.open")}
                    </Link>
                  </div>
                </li>
              </Reveal>
            ))}
          </ul>
        )}
      </div>
    </PageTransition>
  );
}