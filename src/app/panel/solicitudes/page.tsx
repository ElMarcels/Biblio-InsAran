import type { Prisma } from "@prisma/client";
import Link from "next/link";

import { PageTransition } from "@/components/PageTransition";
import { PurchaseSuggestionForm } from "@/components/forms/PurchaseSuggestionForm";
import {
  ApprovePurchaseSuggestionButton,
  RejectPurchaseSuggestionButton,
} from "@/components/panel/PurchaseSuggestionActions";
import { staffCreatePurchaseSuggestionAction } from "@/lib/actions/purchases";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("panel.suggestions.solicitudesDeCompra") };
}

const SUGGESTION_SELECT = {
  id: true,
  title: true,
  author: true,
  isbn: true,
  reason: true,
  status: true,
  proposerName: true,
  proposerEmail: true,
  notes: true,
  createdAt: true,
  resolvedAt: true,
  reader: { select: { id: true, fullName: true } },
  user: { select: { id: true, displayName: true } },
  book: { select: { id: true, title: true } },
} satisfies Prisma.PurchaseSuggestionSelect;

/** Traduce el estado de la solicitud. */
function statusKey(status: string): "status.pendiente" | "status.aprobada" | "status.descartada" {
  if (status === "APPROVED") return "status.aprobada";
  if (status === "REJECTED") return "status.descartada";
  return "status.pendiente";
}

export default async function PurchaseSuggestionsPage() {
  await requireUser();
  const t = await getT();

  const [pending, resolved] = await Promise.all([
    prisma.purchaseSuggestion.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: 100,
      select: SUGGESTION_SELECT,
    }),
    prisma.purchaseSuggestion.findMany({
      where: { status: { not: "PENDING" } },
      orderBy: { resolvedAt: "desc" },
      take: 100,
      select: SUGGESTION_SELECT,
    }),
  ]);

  return (
    <PageTransition>
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="font-display text-[26px] font-bold">
            {t("panel.suggestions.solicitudesDeCompra")}
          </h2>
          <p className="mt-1 max-w-3xl text-[14px] text-ink-soft">
            {t("panel.suggestions.lead")}
          </p>
        </div>

        <section className="border-2 border-line bg-surface">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b-2 border-line bg-paper px-4 py-3">
            <h3 className="font-display text-[19px] font-bold">
              {t("panel.suggestions.pendientes")}
            </h3>
            <span className="border-2 border-line px-2 py-0.5 text-[12px] font-bold tabular-nums">
              {pending.length}
            </span>
          </div>

          {pending.length === 0 ? (
            <p className="px-4 py-6 text-center text-[13.5px] text-ink-faint">
              {t("panel.suggestions.sinSolicitudes")}
            </p>
          ) : (
            <ul className="divide-y divide-hairline">
              {pending.map((suggestion, index) => (
                <li
                  key={suggestion.id}
                  className="anim-row flex flex-wrap items-start gap-x-4 gap-y-2 px-4 py-3"
                  style={{ animationDelay: `${index * 40}ms` }}
                >
                  <div className="min-w-[220px] flex-1">
                    <p className="font-semibold">{suggestion.title}</p>
                    <p className="text-[13px] text-ink-faint">{suggestion.author}</p>
                    {suggestion.isbn ? (
                      <p className="mt-0.5 text-[12px] text-ink-faint">
                        {t("suggest.isbn")}: {suggestion.isbn}
                      </p>
                    ) : null}
                    {suggestion.reason ? (
                      <p className="mt-1 max-w-xl text-[13px] text-ink-soft">
                        {t("panel.suggestions.motivo")}: {suggestion.reason}
                      </p>
                    ) : null}
                  </div>

                  <div className="min-w-[160px]">
                    <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-faint">
                      {t("panel.suggestions.quienLoPide")}
                    </p>
                    {suggestion.reader ? (
                      <Link
                        href={`/panel/lectores/${suggestion.reader.id}`}
                        className="text-[13.5px] font-semibold hover:text-accent"
                      >
                        {suggestion.reader.fullName}
                      </Link>
                    ) : suggestion.user ? (
                      <span className="text-[13.5px] font-semibold">
                        {suggestion.user.displayName}
                      </span>
                    ) : (
                      <>
                        <span className="text-[13.5px] font-semibold">
                          {suggestion.proposerName || t("panel.suggestions.sinCuenta")}
                        </span>
                        {suggestion.proposerEmail ? (
                          <p className="text-[12px] text-ink-faint">
                            {suggestion.proposerEmail}
                          </p>
                        ) : null}
                      </>
                    )}
                    <p className="mt-0.5 text-[12px] tabular-nums text-ink-faint">
                      {formatDate(suggestion.createdAt)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <ApprovePurchaseSuggestionButton
                      suggestionId={suggestion.id}
                      title={suggestion.title}
                    />
                    <RejectPurchaseSuggestionButton
                      suggestionId={suggestion.id}
                      title={suggestion.title}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="border-2 border-line bg-surface">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b-2 border-line bg-paper px-4 py-3">
            <h3 className="font-display text-[19px] font-bold">
              {t("panel.suggestions.resueltas")}
            </h3>
            <span className="border-2 border-line px-2 py-0.5 text-[12px] font-bold tabular-nums">
              {resolved.length}
            </span>
          </div>

          {resolved.length === 0 ? (
            <p className="px-4 py-6 text-center text-[13.5px] text-ink-faint">
              {t("panel.suggestions.sinSolicitudes")}
            </p>
          ) : (
            <ul className="divide-y divide-hairline">
              {resolved.map((suggestion) => (
                <li
                  key={suggestion.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
                >
                  <div className="min-w-[220px] flex-1">
                    <p className="font-semibold">{suggestion.title}</p>
                    <p className="text-[13px] text-ink-faint">{suggestion.author}</p>
                    {suggestion.notes ? (
                      <p className="mt-1 text-[13px] text-ink-soft">
                        {t("panel.suggestions.nota")}: {suggestion.notes}
                      </p>
                    ) : null}
                  </div>
                  <span className="border-2 border-line px-2 py-0.5 text-[12px] font-bold">
                    {t(statusKey(suggestion.status))}
                  </span>
                  {suggestion.book ? (
                    <Link
                      href={`/libro/${suggestion.book.id}`}
                      className="text-[13.5px] font-semibold text-accent underline underline-offset-2"
                    >
                      {t("panel.suggestions.libroGenerado")}: {suggestion.book.title}
                    </Link>
                  ) : null}
                  <span className="text-[12px] tabular-nums text-ink-faint">
                    {suggestion.resolvedAt ? formatDate(suggestion.resolvedAt) : "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="border-2 border-line bg-surface p-6">
          <h3 className="font-display text-[18px] font-semibold">
            {t("panel.suggestions.nuevaSolicitud")}
          </h3>
          <p className="mt-1 mb-5 text-[13px] text-ink-faint">
            {t("panel.suggestions.crearSolicitud")}
          </p>
          <PurchaseSuggestionForm action={staffCreatePurchaseSuggestionAction} />
        </section>
      </div>
    </PageTransition>
  );
}
