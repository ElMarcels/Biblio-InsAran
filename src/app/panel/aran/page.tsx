import Link from "next/link";

import { PageTransition } from "@/components/PageTransition";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("panel.aran.title") };
}

export default async function AranPanelPage() {
  const [user, t] = await Promise.all([requireUser(), getT()]);

  return (
    <PageTransition>
      <div className="flex flex-col gap-6">
        <header>
          <p className="micro mb-1.5">ARAN</p>
          <h2 className="font-display text-[26px] font-bold">
            {t("panel.aran.title")}
          </h2>
          <p className="mt-1.5 max-w-2xl text-[14px] text-ink-soft">
            {t("panel.aran.intro")}
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          <section className="flex flex-col items-start border-2 border-line bg-surface p-6">
            <h3 className="font-display text-[19px] font-bold">
              {t("panel.aran.newsTitle")}
            </h3>
            <p className="mt-2 flex-1 text-[14px] text-ink-soft">
              {t("panel.aran.newsDescription")}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/panel/libros/nuevo" className="btn-primary btn-sm">
                {t("panel.aran.addBook")}
              </Link>
              <Link href="/panel/recursos-digitales/nuevo" className="btn-outline btn-sm">
                {t("panel.aran.addDigitalResource")}
              </Link>
            </div>
          </section>

          <section className="flex flex-col items-start border-2 border-line bg-surface p-6">
            <h3 className="font-display text-[19px] font-bold">
              {t("panel.aran.ideasTitle")}
            </h3>
            <p className="mt-2 flex-1 text-[14px] text-ink-soft">
              {t(
                user.role === "OWNER" || user.role === "ADMIN"
                  ? "panel.aran.ideasManagerDescription"
                  : "panel.aran.ideasDescription",
              )}
            </p>
            <Link href="/panel/aran/ideas" className="btn-outline btn-sm mt-5">
              {t("panel.aran.openIdeas")}
            </Link>
          </section>
        </div>
      </div>
    </PageTransition>
  );
}