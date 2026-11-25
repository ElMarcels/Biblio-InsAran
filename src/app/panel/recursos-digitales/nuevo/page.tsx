import Link from "next/link";

import { PageTransition } from "@/components/PageTransition";
import { DigitalResourceForm } from "@/components/forms/DigitalResourceForm";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("panel.digitalResources.add") };
}

export default async function NewDigitalResourcePage() {
  await requireUser();
  const t = await getT();

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
          <span>{t("panel.digitalResources.add")}</span>
        </nav>

        <header>
          <h2 className="font-display text-[28px] font-bold">
            {t("panel.digitalResources.newResource")}
          </h2>
          <p className="mt-1.5 text-[14px] text-ink-soft">
            {t("panel.digitalResources.formExplanation")}
          </p>
        </header>

        <div className="border-2 border-line bg-surface p-6 sm:p-8">
          <DigitalResourceForm
            mode="create"
            values={{
              title: "",
              author: "",
              type: "PDF",
              url: "",
              description: "",
              language: "",
            }}
          />
        </div>
      </div>
    </PageTransition>
  );
}