import { redirect } from "next/navigation";

import { PageTransition } from "@/components/PageTransition";
import { Notice } from "@/components/Notice";
import { ChangePinForm } from "@/components/reader/ChangePinForm";
import { SITE_NAME } from "@/lib/constants";
import { getT } from "@/lib/i18n/server";
import { requireReader } from "@/lib/reader-auth";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("reader.choosePin") };
}

/**
 * Primer acceso: obliga a elegir PIN propio antes de entrar en la zona
 * personal. Vive fuera del layout protegido para que no haya bucles.
 */
export default async function ChangePinPage() {
  const reader = await requireReader();
  if (!reader.pinMustChange) redirect("/mi-biblioteca/prestamos");

  const t = await getT();

  return (
    <PageTransition>
      <div className="flex flex-1 items-center">
        <div className="shell flex justify-center py-14">
          <div className="animate-scale-in w-full max-w-md border-2 border-line bg-surface p-7 shadow-[8px_8px_0_0_var(--color-line)] sm:p-9">
            <p className="micro mb-2">{SITE_NAME}</p>
            <h1 className="font-display text-[28px] font-bold">
              {t("reader.firstAccess")}
            </h1>
            <p className="mt-3 text-[14px] leading-relaxed text-ink-soft">
              {t("reader.chooseNewPin", { name: reader.fullName })}
            </p>

            <div className="mt-6">
              <ChangePinForm forced />
            </div>

            <Notice tone="info" className="mt-6">
              {t("reader.doNotSharePin")}
            </Notice>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
