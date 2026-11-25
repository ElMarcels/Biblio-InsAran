import Link from "next/link";

import { EmptyState } from "@/components/EmptyState";
import { Notice } from "@/components/Notice";
import { PageTransition } from "@/components/PageTransition";
import { DeleteDigitalResourceButton } from "@/components/panel/DeleteDigitalResourceButton";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import type { TranslationKey } from "@/lib/i18n/translate";
import { prisma } from "@/lib/prisma";
import type { DigitalResourceType } from "@/lib/validation";

const TYPE_LABELS: Record<DigitalResourceType, TranslationKey> = {
  AUDIOBOOK: "digitalResources.type.AUDIOBOOK",
  PDF: "digitalResources.type.PDF",
  EBOOK: "digitalResources.type.EBOOK",
  LINK: "digitalResources.type.LINK",
};

const FLASH: Record<string, TranslationKey> = {
  creado: "panel.digitalResources.created",
  guardado: "panel.digitalResources.saved",
};

export async function generateMetadata() {
  const t = await getT();
  return { title: t("panel.digitalResources.title") };
}

export default async function PanelDigitalResourcesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser();
  const [t, resources, params] = await Promise.all([
    getT(),
    prisma.digitalResource.findMany({ orderBy: [{ updatedAt: "desc" }, { title: "asc" }] }),
    searchParams,
  ]);
  const notice = Array.isArray(params.aviso) ? params.aviso[0] : params.aviso;

  return (
    <PageTransition>
      <div className="flex flex-col gap-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-[26px] font-bold">
              {t("panel.digitalResources.title")}
            </h2>
            <p className="mt-1 max-w-2xl text-[14px] text-ink-soft">
              {t("panel.digitalResources.description")}
            </p>
          </div>
          <Link href="/panel/recursos-digitales/nuevo" className="btn-primary">
            {t("panel.digitalResources.add")}
          </Link>
        </header>

        {notice && FLASH[notice] ? <Notice tone="success">{t(FLASH[notice])}</Notice> : null}

        {resources.length === 0 ? (
          <EmptyState
            title={t("panel.digitalResources.emptyTitle")}
            description={t("panel.digitalResources.emptyDescription")}
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {resources.map((resource) => (
              <li key={resource.id} className="flex flex-col border-2 border-line bg-surface">
                <div className="flex-1 p-5">
                  <p className="micro mb-2">{t(TYPE_LABELS[resource.type])}</p>
                  <h3 className="font-display text-[18px] font-bold">{resource.title}</h3>
                  {resource.author ? (
                    <p className="mt-1 text-[13px] text-ink-faint">{resource.author}</p>
                  ) : null}
                  <p className="mt-3 break-all text-[12px] text-ink-faint">{resource.url}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 border-t-2 border-line p-4">
                  <Link
                    href={`/panel/recursos-digitales/${resource.id}/editar`}
                    className="btn-outline btn-sm"
                  >
                    {t("panel.digitalResources.edit")}
                  </Link>
                  <Link
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-ghost btn-sm"
                  >
                    {t("panel.digitalResources.preview")}
                  </Link>
                  <DeleteDigitalResourceButton id={resource.id} title={resource.title} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageTransition>
  );
}