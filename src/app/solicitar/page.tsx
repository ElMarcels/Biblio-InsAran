import Link from "next/link";

import { PageTransition } from "@/components/PageTransition";
import { PurchaseSuggestionForm } from "@/components/forms/PurchaseSuggestionForm";
import { createPurchaseSuggestionAction } from "@/lib/actions/purchases";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("suggest.title") };
}

/**
 * Formulario público para pedir un título que todavía no está en el catálogo.
 * Lo usan el alumnado, el profesorado y las familias; el personal lo resuelve
 * desde el panel y, al aprobarlo, el libro entra en el catálogo.
 */
export default async function SuggestPage() {
  const t = await getT();

  return (
    <PageTransition>
      <div className="shell flex flex-1 flex-col py-10">
        <nav
          aria-label={t("suggest.migasDePan")}
          className="mb-7 text-[13px] text-ink-faint"
        >
          <Link href="/catalogo" className="underline underline-offset-2 hover:text-ink">
            {t("book.catalogo")}
          </Link>
          <span className="px-2">/</span>
          <span>{t("suggest.title")}</span>
        </nav>

        <header className="mb-8 max-w-2xl animate-fade-in-up">
          <p className="micro mb-3">{t("suggest.title")}</p>
          <h1 className="font-display text-[34px] font-bold sm:text-[42px]">
            {t("suggest.title")}
          </h1>
          <p className="mt-2 text-[15px] text-ink-soft">{t("suggest.lead")}</p>
        </header>

        <div className="max-w-2xl animate-fade-in-up" style={{ animationDelay: "80ms" }}>
          <PurchaseSuggestionForm
            action={createPurchaseSuggestionAction}
            showProposer
          />
        </div>

        <p className="mt-8 text-[13px] text-ink-faint">
          <Link href="/catalogo" className="underline underline-offset-2 hover:text-ink">
            {t("suggest.backToCatalog")}
          </Link>
        </p>
      </div>
    </PageTransition>
  );
}
