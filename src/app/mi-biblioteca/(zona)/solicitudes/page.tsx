import { redirect } from "next/navigation";

import { EmptyState } from "@/components/EmptyState";
import { PageTransition } from "@/components/PageTransition";
import { PurchaseSuggestionForm } from "@/components/forms/PurchaseSuggestionForm";
import { readerCreatePurchaseSuggestionAction } from "@/lib/actions/purchases";
import { formatDate } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";
import { requireReader } from "@/lib/reader-auth";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("reader.tabSuggestions") };
}

/** Traduce el estado de la solicitud. */
function statusKey(
  status: string,
): "status.pendiente" | "status.aprobada" | "status.descartada" {
  if (status === "APPROVED") return "status.aprobada";
  if (status === "REJECTED") return "status.descartada";
  return "status.pendiente";
}

/**
 * Solicitudes de compra que ha hecho la persona lectora: títulos que ha
 * pedido y que todavía no están en el catálogo. El personal las resuelve desde
 * el panel; al aprobarlas, el libro entra en el catálogo.
 */
export default async function ReaderSuggestionsPage() {
  const session = await requireReader();
  const t = await getT();

  const reader = await prisma.reader.findUnique({
    where: { id: session.id },
    select: { id: true, fullName: true, email: true },
  });
  if (!reader) redirect("/mi-biblioteca");

  const suggestions = await prisma.purchaseSuggestion.findMany({
    where: { readerId: reader.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { book: { select: { id: true, title: true } } },
  });

  return (
    <PageTransition>
      <div className="flex flex-col gap-6">
        <header>
          <h2 className="font-display text-[26px] font-bold">
            {t("reader.mySuggestions")}
          </h2>
          <p className="mt-1 max-w-3xl text-[14px] text-ink-soft">
            {t("reader.suggestionsLead")}
          </p>
        </header>

        {suggestions.length === 0 ? (
          <EmptyState
            title={t("reader.noSuggestions")}
            description={t("reader.suggestionsLead")}
          />
        ) : (
          <ul className="divide-y divide-hairline border-2 border-line bg-surface">
            {suggestions.map((suggestion) => (
              <li
                key={suggestion.id}
                className="flex flex-wrap items-start gap-x-4 gap-y-2 px-4 py-4"
              >
                <div className="min-w-[220px] flex-1">
                  <p className="font-semibold">{suggestion.title}</p>
                  <p className="text-[13px] text-ink-faint">{suggestion.author}</p>
                  {suggestion.reason ? (
                    <p className="mt-1 max-w-xl text-[13px] text-ink-soft">
                      {suggestion.reason}
                    </p>
                  ) : null}
                  <p className="mt-1 text-[12px] tabular-nums text-ink-faint">
                    {formatDate(suggestion.createdAt)}
                  </p>
                </div>
                <span className="border-2 border-line px-2 py-0.5 text-[12px] font-bold">
                  {t(statusKey(suggestion.status))}
                </span>
                {suggestion.book ? (
                  <p className="text-[13px] font-semibold text-ok">
                    {t("reader.suggestionBookCreated")}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        <section className="border-2 border-line bg-surface p-6">
          <h3 className="font-display text-[19px] font-bold">
            {t("reader.newSuggestion")}
          </h3>
          <div className="mt-4 max-w-2xl">
            <PurchaseSuggestionForm action={readerCreatePurchaseSuggestionAction} />
          </div>
        </section>
      </div>
    </PageTransition>
  );
}
