import type { Prisma } from "@prisma/client";
import Link from "next/link";

import { EmptyState } from "@/components/EmptyState";
import { Notice } from "@/components/Notice";
import { PageTransition } from "@/components/PageTransition";
import { Pagination } from "@/components/Pagination";
import { RenewLoanButton, ReturnLoanButton } from "@/components/panel/LoanRowActions";
import { SendOverdueRemindersButton } from "@/components/panel/SendOverdueRemindersButton";
import { requireUser } from "@/lib/auth";
import { CIRCULATION_PAGE_SIZE, DEFAULT_LOAN_DAYS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import type { TranslationKey } from "@/lib/i18n/translate";
import { isOverdue } from "@/lib/library";
import { prisma } from "@/lib/prisma";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("panel.loans.prestamos") };
}

const FLASH: Record<string, TranslationKey> = {
  creado: "panel.loans.flashCreated",
};

const STATES = {
  activos: "panel.loans.stateActive",
  vencidos: "panel.loans.stateOverdue",
  devueltos: "panel.loans.stateReturned",
  todos: "panel.loans.stateAll",
} as const;

type StateKey = keyof typeof STATES;

function one(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function LoansPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser();
  const t = await getT();
  const params = await searchParams;
  const stateKey = (one(params.estado) || "activos") as StateKey;
  const estado = stateKey in STATES ? stateKey : "activos";
  const aviso = one(params.aviso);
  const requestedPage = Math.max(1, Number.parseInt(one(params.pagina) || "1", 10) || 1);

  const where: Prisma.LoanWhereInput =
    estado === "activos"
      ? { returnedAt: null }
      : estado === "vencidos"
        ? { returnedAt: null, dueAt: { lt: new Date() } }
        : estado === "devueltos"
          ? { returnedAt: { not: null } }
          : {};

  const [total, counts] = await Promise.all([
    prisma.loan.count({ where }),
    Promise.all([
      prisma.loan.count({ where: { returnedAt: null } }),
      prisma.loan.count({ where: { returnedAt: null, dueAt: { lt: new Date() } } }),
      prisma.loan.count({ where: { returnedAt: { not: null } } }),
    ]),
  ]);

  const [activeCount, overdueCount, returnedCount] = counts;
  const totalPages = Math.max(1, Math.ceil(total / CIRCULATION_PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);

  const loans = await prisma.loan.findMany({
    where,
    orderBy:
      estado === "devueltos"
        ? [{ returnedAt: "desc" }]
        : [{ dueAt: "asc" }],
    skip: (page - 1) * CIRCULATION_PAGE_SIZE,
    take: CIRCULATION_PAGE_SIZE,
    include: {
      book: { select: { id: true, title: true, author: true } },
      reader: { select: { id: true, fullName: true, groupName: true } },
    },
  });

  const hrefFor = (targetPage: number) => {
    const search = new URLSearchParams();
    if (estado !== "activos") search.set("estado", estado);
    if (targetPage > 1) search.set("pagina", String(targetPage));
    const suffix = search.toString();
    return suffix ? `/panel/prestamos?${suffix}` : "/panel/prestamos";
  };

  const tabs: Array<{ key: StateKey; count: number }> = [
    { key: "activos", count: activeCount },
    { key: "vencidos", count: overdueCount },
    { key: "devueltos", count: returnedCount },
    { key: "todos", count: activeCount + returnedCount },
  ];

  return (
    <PageTransition>
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-[26px] font-bold">{t("panel.loans.prestamos")}</h2>
          <p className="mt-1 text-[14px] text-ink-soft tabular-nums">
            {activeCount === 1 ? t("panel.loans.oneActiveLoan") : t("panel.loans.nActiveLoans", { n: activeCount })}
            {overdueCount > 0 ? t("panel.loans.nVencidos", { n: overdueCount }) : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <SendOverdueRemindersButton />
          <Link href="/panel/prestamos/nuevo" className="btn-primary">
            {t("panel.loans.registrarPrestamo")}
          </Link>
        </div>
      </div>

      <section className="border-2 border-line bg-surface px-4 py-3">
        <h3 className="font-display text-[16px] font-bold">
          {t("panel.loans.avisosDeRetraso")}
        </h3>
        <p className="mt-0.5 text-[13px] text-ink-soft">
          {t("panel.loans.avisosDeRetrasoDesc")}
        </p>
      </section>

      {FLASH[aviso] ? <Notice tone="success">{t(FLASH[aviso])}</Notice> : null}

      <nav aria-label={t("panel.loans.filtrosDePrestamos")} className="flex flex-wrap gap-1.5">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={tab.key === "activos" ? "/panel/prestamos" : `/panel/prestamos?estado=${tab.key}`}
            className={
              tab.key === estado
                ? "animate-pop border-2 border-line bg-ink px-3 py-1.5 text-[13px] font-semibold text-paper"
                : "border-2 border-line bg-surface px-3 py-1.5 text-[13px] font-semibold transition duration-150 hover:-translate-y-0.5 hover:bg-paper hover:shadow-[2px_2px_0_0_var(--color-line)]"
            }
          >
            {t(STATES[tab.key])} ({tab.count})
          </Link>
        ))}
      </nav>

      {loans.length === 0 ? (
        <EmptyState
          title={t("panel.loans.sinPrestamos")}
          description={
            estado === "vencidos"
              ? t("panel.loans.ahoraMismoNoHayNingunPrestamoVencidoBuenTrabajo")
              : estado === "devueltos"
                ? t("panel.loans.todaviaNoSeHaRegistradoNingunaDevolucion")
                : t("panel.loans.noHayPrestamosEnEsteMomentoRegistraUnoParaEmpezar")
          }
          action={
            <Link href="/panel/prestamos/nuevo" className="btn-primary">
              {t("panel.loans.registrarPrestamo")}
            </Link>
          }
        />
      ) : (
        <div className="overflow-x-auto border-2 border-line bg-surface">
          <table className="w-full min-w-[820px] border-collapse text-left">
            <caption className="sr-only">{t("panel.loans.listadoDePrestamos")}</caption>
            <thead>
              <tr className="border-b-2 border-line bg-paper">
                <th scope="col" className="px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide">{t("panel.loans.libro")}</th>
                <th scope="col" className="px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide">{t("panel.loans.lectorA")}</th>
                <th scope="col" className="px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide">{t("panel.loans.prestado")}</th>
                <th scope="col" className="px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide">
                  {estado === "devueltos" ? t("panel.loans.devuelto") : t("panel.loans.devolverAntesDe")}
                </th>
                <th scope="col" className="px-4 py-2.5 text-right text-[12px] font-semibold uppercase tracking-wide">
                  {estado === "devueltos" ? t("panel.loans.estado") : t("panel.loans.acciones")}
                </th>
              </tr>
            </thead>
            <tbody>
              {loans.map((loan, index) => {
                const overdue = isOverdue(loan);
                return (
                  <tr
                    key={loan.id}
                    className="anim-row border-b border-hairline last:border-b-0 align-top"
                    style={{ animationDelay: `${Math.min(index * 45, 540)}ms` }}
                  >
                    <td className="px-4 py-3">
                      <Link href={`/libro/${loan.book.id}`} className="font-semibold hover:text-accent">
                        {loan.book.title}
                      </Link>
                      <p className="text-[13px] text-ink-faint">{loan.book.author}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/panel/lectores/${loan.reader.id}`} className="font-semibold hover:text-accent">
                        {loan.reader.fullName}
                      </Link>
                      {loan.reader.groupName ? (
                        <p className="text-[13px] text-ink-faint">{loan.reader.groupName}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-[13px] tabular-nums text-ink-soft">
                      {formatDate(loan.loanedAt)}
                    </td>
                    <td className="px-4 py-3 text-[13px] tabular-nums">
                      {loan.returnedAt ? (
                        <span className="text-ink-soft">{formatDate(loan.returnedAt)}</span>
                      ) : (
                        <span className={overdue ? "font-semibold text-danger" : undefined}>
                          {formatDate(loan.dueAt)}
                          {overdue ? t("panel.loans.vencido") : ""}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {loan.returnedAt ? (
                        <div className="flex justify-end">
                          <span className="tag-muted">{t("panel.loans.devuelto")}</span>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-start justify-end gap-1.5">
                          <RenewLoanButton loanId={loan.id} days={DEFAULT_LOAN_DAYS} />
                          <ReturnLoanButton loanId={loan.id} />
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex justify-center">
          <Pagination page={page} totalPages={totalPages} hrefFor={hrefFor} />
        </div>
      ) : null}
    </div>
    </PageTransition>
  );
}
