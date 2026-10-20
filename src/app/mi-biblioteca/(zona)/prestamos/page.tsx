import Link from "next/link";
import { redirect } from "next/navigation";

import { Notice } from "@/components/Notice";
import { PageTransition } from "@/components/PageTransition";
import { ReaderRenewButton } from "@/components/reader/ReaderActions";
import { DEFAULT_LOAN_DAYS, READER_MAX_RENEWALS } from "@/lib/constants";
import { formatDate, isPermanentSuspension } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { isOverdue, isSuspended } from "@/lib/library";
import { prisma } from "@/lib/prisma";
import { requireReader } from "@/lib/reader-auth";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("reader.tabLoans") };
}

export default async function ReaderLoansPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireReader();
  const [t, params] = await Promise.all([getT(), searchParams]);
  const aviso = Array.isArray(params.aviso) ? params.aviso[0] : params.aviso;

  const [reader, loans] = await Promise.all([
    prisma.reader.findUnique({ where: { id: session.id } }),
    prisma.loan.findMany({
      where: { readerId: session.id, returnedAt: null },
      include: { book: { select: { id: true, title: true, author: true } } },
      orderBy: { dueAt: "asc" },
    }),
  ]);
  if (!reader) redirect("/mi-biblioteca");

  // Reservas de otras personas sobre estos libros: bloquean la prórroga.
  const waitingRows = await prisma.reservation.groupBy({
    by: ["bookId"],
    where: {
      bookId: { in: loans.map((loan) => loan.bookId) },
      status: "ACTIVE",
      NOT: { readerId: reader.id },
    },
    _count: { _all: true },
  });
  const waitingByBook = new Map(
    waitingRows.map((row) => [row.bookId, row._count._all]),
  );

  const suspended = isSuspended(reader);
  const overdueCount = loans.filter((loan) => isOverdue(loan)).length;

  return (
    <PageTransition>
      <div className="flex flex-col gap-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-[26px] font-bold">
              {t("reader.tabLoans")}
            </h2>
            <p className="mt-1.5 text-[14px] text-ink-soft">
              {loans.length > 0
                ? t("reader.loansSummary", {
                    n: loans.length,
                    overdue: overdueCount,
                  })
                : t("reader.noLoansLead")}
            </p>
          </div>
        </header>

        {aviso === "pin" ? (
          <Notice tone="success">{t("reader.pinUpdated")}</Notice>
        ) : null}

        {suspended ? (
          <Notice tone="danger">
            {isPermanentSuspension(reader.suspendedUntil)
              ? t("reader.suspendedPermanently")
              : t("reader.suspendedUntil", {
                  date: formatDate(reader.suspendedUntil),
                })}
            {reader.suspensionReason ? ` ${reader.suspensionReason}` : ""}
          </Notice>
        ) : null}

        {loans.length === 0 ? (
          <p className="border-2 border-dashed border-hairline bg-surface p-7 text-center text-[14px] text-ink-soft">
            {t("reader.noActiveLoans")}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {loans.map((loan, index) => {
              const overdue = isOverdue(loan);
              const waiting = waitingByBook.get(loan.bookId) ?? 0;
              const renewalsLeft = READER_MAX_RENEWALS - loan.renewals;
              const canRenew = renewalsLeft > 0 && waiting === 0;

              return (
                <li
                  key={loan.id}
                  className="anim-row flex flex-wrap items-start justify-between gap-4 border-2 border-line bg-surface p-4"
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <div className="min-w-0">
                    <Link
                      href={`/libro/${loan.book.id}`}
                      className="font-semibold hover:text-accent"
                    >
                      {loan.book.title}
                    </Link>
                    <p className="text-[13px] text-ink-faint">{loan.book.author}</p>
                    <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] tabular-nums text-ink-soft">
                      <span>
                        {t("reader.loanedOn", { date: formatDate(loan.loanedAt) })}
                      </span>
                      <span className={overdue ? "font-semibold text-danger" : undefined}>
                        {t("reader.dueBy", { date: formatDate(loan.dueAt) })}
                        {overdue ? ` · ${t("reader.overdue")}` : ""}
                      </span>
                      {loan.renewals > 0 ? (
                        <span className="text-ink-faint">
                          {t("reader.renewalsUsed", {
                            used: loan.renewals,
                            max: READER_MAX_RENEWALS,
                          })}
                        </span>
                      ) : null}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-1.5">
                    {canRenew ? (
                      <ReaderRenewButton loanId={loan.id} />
                    ) : (
                      <span className="max-w-[26ch] text-right text-[12px] font-semibold text-ink-faint">
                        {waiting > 0
                          ? t("reader.renewBlockedInfo")
                          : t("reader.renewLimitInfo", { max: READER_MAX_RENEWALS })}
                      </span>
                    )}
                    <span className="text-[12px] text-ink-faint">
                      {t("reader.loanPeriod", { days: DEFAULT_LOAN_DAYS })}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </PageTransition>
  );
}
