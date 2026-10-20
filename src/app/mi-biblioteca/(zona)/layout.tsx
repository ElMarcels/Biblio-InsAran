import Link from "next/link";
import { redirect } from "next/navigation";

import { readerLogoutAction } from "@/lib/actions/reader-auth";
import { ReaderNav } from "@/components/reader/ReaderNav";
import { getT } from "@/lib/i18n/server";
import { requireReader } from "@/lib/reader-auth";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("reader.pageTitle") };
}

/**
 * Zona personal del lector/a. El acceso se comprueba aquí (y de forma
 * optimista en el proxy); además, quien todavía no ha cambiado su PIN es
 * redirigido al primer acceso.
 */
export default async function ReaderZoneLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [reader, t] = await Promise.all([requireReader(), getT()]);
  if (reader.pinMustChange) redirect("/mi-biblioteca/cambio-pin");

  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b-2 border-line bg-surface">
        <div className="shell flex flex-col gap-5 py-6">
          <div className="flex animate-fade-in-up flex-wrap items-end justify-between gap-3">
            <div>
              <p className="micro mb-1.5">{t("reader.myLibrary")}</p>
              <h1 className="font-display text-[26px] font-bold">{reader.fullName}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {reader.cardNumber ? (
                <span className="tag-muted animate-pop">{reader.cardNumber}</span>
              ) : null}
              {reader.groupName ? (
                <span className="tag-muted animate-pop">{reader.groupName}</span>
              ) : null}
              <form action={readerLogoutAction}>
                <button type="submit" className="btn-outline btn-sm">
                  {t("reader.logout")}
                </button>
              </form>
            </div>
          </div>

          <div className="animate-fade-in-up">
            <ReaderNav />
          </div>
        </div>
      </div>

      <div className="shell flex-1 py-9">
        <div className="mx-auto flex max-w-4xl flex-col gap-7">{children}</div>
      </div>

      <p className="shell pb-8 text-[13px] text-ink-faint">
        <Link href="/catalogo" className="underline underline-offset-2 hover:text-ink">
          {t("reader.backToCatalog")}
        </Link>
      </p>
    </div>
  );
}
