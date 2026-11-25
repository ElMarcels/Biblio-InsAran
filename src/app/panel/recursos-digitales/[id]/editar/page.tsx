import Link from "next/link";
import { notFound } from "next/navigation";

import { DigitalResourceForm } from "@/components/forms/DigitalResourceForm";
import { PageTransition } from "@/components/PageTransition";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { id } = await params;
  const [resource, t] = await Promise.all([
    prisma.digitalResource.findUnique({ where: { id }, select: { title: true } }),
    getT(),
  ]);
  return { title: resource?.title ?? t("panel.digitalResources.notFound") };
}

export default async function EditDigitalResourcePage({
  params,
}: {
  params: Params;
}) {
  await requireUser();
  const { id } = await params;
  const [resource, t] = await Promise.all([
    prisma.digitalResource.findUnique({ where: { id } }),
    getT(),
  ]);
  if (!resource) notFound();

  return (
    <PageTransition>
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <nav aria-label={t("panel.digitalResources.breadcrumb")} className="text-[13px] text-ink-faint">
          <Link
            href="/panel/recursos-digitales"
            className="font-semibold text-ink underline underline-offset-2"
          >
            {t("panel.digitalResources.title")}
          </Link>
          <span className="px-2">/</span>
          <span>{t("panel.digitalResources.edit")}</span>
        </nav>

        <header>
          <h2 className="font-display text-[28px] font-bold">
            {t("panel.digitalResources.editResource")}
          </h2>
          <p className="mt-1.5 text-[14px] text-ink-soft">
            {t("panel.digitalResources.formExplanation")}
          </p>
        </header>

        <div className="border-2 border-line bg-surface p-6 sm:p-8">
          <DigitalResourceForm
            mode="edit"
            values={{
              id: resource.id,
              title: resource.title,
              author: resource.author ?? "",
              type: resource.type,
              url: resource.url,
              description: resource.description ?? "",
              language: resource.language ?? "",
            }}
          />
        </div>
      </div>
    </PageTransition>
  );
}