import Link from "next/link";
import { redirect } from "next/navigation";

import { PageTransition } from "@/components/PageTransition";
import { daysLate, formatDate } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";
import { requireReader } from "@/lib/reader-auth";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("reader.tabHistory") };
}

export default async function ReaderHistoryPage() {
  const session = await requireReader();
  const t = await getT();

  const reader = await prisma.reader.findUnique({ where: { id: session.id } });
  if (!reader) redirect("/mi-biblioteca");

  const [loans, reservations] = await Promise.all([
    prisma.loan.findMany({
      where: { readerId: reader.id, returnedAt: { not: null } },
      include: { book: { select: { id: true, title: true, author: true } } },
      orderBy: { returnedAt: "desc" },
    }),
    prisma.reservation.findMany({
      where: {
        readerId: reader.id,
        status: { not: "ACTIVE" },
      },
      include: { book: { select: { id: true, title: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <PageTransition>
      <div className="flex flex-col gap-7">
        <header>
          <h2 className="font-display text-[26px] font-bold">
            {t("reader.tabHistory")}
          </h2>
          <p className="mt-1.5 text-[14px] text-ink-soft">
            {t("reader.historyLead")}
          </p>
        </header>

        <section className="flex flex-col gap-3">
          <h3 className="font-display text-[19px] font-semibold">
            {t("reader.loanHistoryN", { n: loans.length })}
          </h3>
          {loans.length === 0 ? (
            <p className="border-2 border-dashed border-hairline bg-surface p-6 text-center text-[14px] text-ink-soft">
              {t("reader.noReturnedLoans")}
            </p>
          ) : (
            <div className="overflow-x-auto border-2 border-line bg-surface">
              <table className="w-full min-w-[560px] border-collapse text-left">
                <thead>
                  <tr className="border-b-2 border-line bg-paper">
                    <th scope="col" className="px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide">
                      {t("reader.bookCol")}
                    </th>
                    <th scope="col" className="px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide">
                      {t("reader.loanedCol")}
                    </th>
                    <th scope="col" className="px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide">
                      {t("reader.returnedCol")}
                    </th>
                    <th scope="col" className="px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide">
                      {t("reader.statusCol")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loans.map((loan) => {
                    const late = daysLate(loan.dueAt, loan.returnedAt);
                    return (
                      <tr key={loan.id} className="border-b border-hairline last:border-b-0">
                        <td className="px-4 py-3">
                          <Link
                            href={`/libro/${loan.book.id}`}
                            className="font-semibold hover:text-accent"
                          >
                            {loan.book.title}
                          </Link>
                          <p className="text-[13px] text-ink-faint">{loan.book.author}</p>
                        </td>
                        <td className="px-4 py-3 text-[13px] tabular-nums text-ink-soft">
                          {formatDate(loan.loanedAt)}
                        </td>
                        <td className="px-4 py-3 text-[13px] tabular-nums text-ink-soft">
                          {formatDate(loan.returnedAt)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="tag-muted">
                            {t("reader.returned")}
                          </span>
                          {late > 0 ? (
                            <span
                              className="tag-warn ml-1.5"
                              title={t("reader.lateDays", { days: late })}
                            >
                              +{late}
                            </span>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="font-display text-[19px] font-semibold">
            {t("reader.reservationHistoryN", { n: reservations.length })}
          </h3>
          {reservations.length === 0 ? (
            <p className="border-2 border-dashed border-hairline bg-surface p-6 text-center text-[14px] text-ink-soft">
              {t("reader.noPastReservations")}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {reservations.map((reservation) => (
                <li
                  key={reservation.id}
                  className="flex flex-wrap items-center justify-between gap-3 border-2 border-line bg-surface px-4 py-3"
                >
                  <div>
                    <Link
                      href={`/libro/${reservation.book.id}`}
                      className="font-semibold hover:text-accent"
                    >
                      {reservation.book.title}
                    </Link>
                    <p className="text-[13px] text-ink-faint">
                      {t("reader.reservedOn", { date: formatDate(reservation.createdAt) })}
                    </p>
                  </div>
                  <span className="tag-muted">
                    {reservation.status === "FULFILLED"
                      ? t("reader.reservationFulfilled")
                      : t("reader.reservationCancelledStatus")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </PageTransition>
  );
}
