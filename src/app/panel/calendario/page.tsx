import Link from "next/link";
import type { Prisma } from "@prisma/client";

import { PageTransition } from "@/components/PageTransition";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function daysInMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function getDayOffset(date: Date) {
  // Monday as first day
  const day = date.getDay();
  return (day + 6) % 7;
}

function one(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export async function generateMetadata() {
  const t = await getT();
  return { title: t("panel.calendar.calendarioDeVencimientos") };
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser();
  const t = await getT();
  const params = await searchParams;
  const mesParam = one(params.mes);
  const base = mesParam ? new Date(`${mesParam}-01T00:00:00`) : new Date();
  const monthDate = isNaN(base.getTime()) ? new Date() : base;

  const from = startOfMonth(monthDate);
  const to = endOfMonth(monthDate);
  const prevMonth = addMonths(monthDate, -1);
  const nextMonth = addMonths(monthDate, 1);

  const where: Prisma.LoanWhereInput = {
    returnedAt: null,
    dueAt: { gte: from, lte: to },
  };

  const loans = await prisma.loan.findMany({
    where,
    orderBy: [{ dueAt: "asc" }, { loanedAt: "asc" }],
    include: {
      book: { select: { id: true, title: true } },
      reader: { select: { id: true, fullName: true, groupName: true } },
    },
  });

  const loansByDay = new Map<number, typeof loans>();
  for (const loan of loans) {
    const day = loan.dueAt.getDate();
    const list = loansByDay.get(day) ?? [];
    list.push(loan);
    loansByDay.set(day, list);
  }

  const totalDays = daysInMonth(monthDate);
  const offset = getDayOffset(from);
  const monthLabel = monthDate.toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });

  const prevHref = `/panel/calendario?mes=${prevMonth.getFullYear()}-${String(
    prevMonth.getMonth() + 1,
  ).padStart(2, "0")}`;
  const nextHref = `/panel/calendario?mes=${nextMonth.getFullYear()}-${String(
    nextMonth.getMonth() + 1,
  ).padStart(2, "0")}`;
  const todayHref = "/panel/calendario";

  return (
    <PageTransition>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-[26px] font-bold">
              {t("panel.calendar.calendarioDeVencimientos")}
            </h2>
            <p className="mt-1 text-[14px] text-ink-soft">
              {t("panel.calendar.prestamosSinDevolverQueVencenEsteMes")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={prevHref} className="btn-outline btn-sm">
              {t("panel.calendar.mesAnterior")}
            </Link>
            <Link href={todayHref} className="btn-outline btn-sm">
              {t("panel.calendar.mesActual")}
            </Link>
            <Link href={nextHref} className="btn-outline btn-sm">
              {t("panel.calendar.mesSiguiente")}
            </Link>
            <Link href="/panel/prestamos" className="btn-ghost btn-sm">
              {t("panel.calendar.verPrestamos")}
            </Link>
          </div>
        </div>

        <section className="border-2 border-line bg-surface">
          <header className="flex items-center justify-between border-b-2 border-line px-4 py-3">
            <h3 className="font-display text-[18px] font-bold capitalize">{monthLabel}</h3>
            <p className="text-[13px] text-ink-soft tabular-nums">
              {loans.length === 1
                ? t("panel.calendar.unVencimiento")
                : t("panel.calendar.nVencimientos", { n: loans.length })}
            </p>
          </header>
          <div className="grid grid-cols-7 border-b border-hairline text-center text-[12px] font-semibold uppercase tracking-wide text-ink-faint">
            {["L", "M", "X", "J", "V", "S", "D"].map((day) => (
              <div key={day} className="px-2 py-2">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: offset }).map((_, index) => (
              <div
                key={`empty-${index}`}
                className="min-h-[110px] border-b border-r border-hairline bg-paper/40"
              />
            ))}
            {Array.from({ length: totalDays }).map((_, index) => {
              const day = index + 1;
              const dayLoans = loansByDay.get(day) ?? [];
              const isToday =
                new Date().getFullYear() === monthDate.getFullYear() &&
                new Date().getMonth() === monthDate.getMonth() &&
                new Date().getDate() === day;
              const isPast = new Date(from.getFullYear(), from.getMonth(), day) < new Date(new Date().setHours(0, 0, 0, 0));

              return (
                <div
                  key={day}
                  className="min-h-[110px] border-b border-r border-hairline p-2"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[13px] font-semibold ${
                        isToday
                          ? "flex h-6 w-6 items-center justify-center rounded-full bg-ink text-paper"
                          : isPast
                            ? "text-danger"
                            : "text-ink"
                      }`}
                    >
                      {day}
                    </span>
                    {dayLoans.length > 0 ? (
                      <span className="text-[11px] text-ink-faint tabular-nums">
                        {dayLoans.length}
                      </span>
                    ) : null}
                  </div>
                  <ul className="mt-2 flex flex-col gap-1">
                    {dayLoans.slice(0, 3).map((loan) => (
                      <li key={loan.id}>
                        <Link
                          href={`/panel/lectores/${loan.reader.id}`}
                          className="block rounded border border-line bg-surface px-2 py-1 text-[11px] leading-tight hover:bg-paper"
                        >
                          <p className="truncate font-semibold">{loan.reader.fullName}</p>
                          <p className="truncate text-ink-faint">{loan.book.title}</p>
                        </Link>
                      </li>
                    ))}
                    {dayLoans.length > 3 ? (
                      <li className="px-1 text-[11px] text-ink-faint">
                        {t("panel.calendar.masN", { n: dayLoans.length - 3 })}
                      </li>
                    ) : null}
                  </ul>
                </div>
              );
            })}
            {Array.from({ length: (7 - ((offset + totalDays) % 7)) % 7 }).map((_, index) => (
              <div
                key={`empty-end-${index}`}
                className="min-h-[110px] border-b border-r border-hairline bg-paper/40"
              />
            ))}
          </div>
        </section>

        {loans.length === 0 ? (
          <div className="border-2 border-dashed border-hairline bg-surface p-6 text-center text-[14px] text-ink-soft">
            {t("panel.calendar.noHayVencimientosEsteMes")}
          </div>
        ) : (
          <section>
            <h3 className="mb-3 font-display text-[18px] font-bold">
              {t("panel.calendar.listadoDelMes")}
            </h3>
            <ul className="border-2 border-line bg-surface">
              {loans.map((loan) => {
                const isPast = loan.dueAt < new Date(new Date().setHours(0, 0, 0, 0));
                return (
                  <li
                    key={loan.id}
                    className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-4 py-2.5 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold">
                        <Link href={`/panel/lectores/${loan.reader.id}`} className="hover:text-accent">
                          {loan.reader.fullName}
                        </Link>
                        {loan.reader.groupName ? (
                          <span className="text-ink-faint"> · {loan.reader.groupName}</span>
                        ) : null}
                      </p>
                      <p className="truncate text-[13px] text-ink-soft">
                        <Link href={`/libro/${loan.book.id}`} className="hover:text-accent">
                          {loan.book.title}
                        </Link>
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      <p className={`text-[13px] tabular-nums ${isPast ? "font-semibold text-danger" : "text-ink-soft"}`}>
                        {t("panel.calendar.venceEl")} {formatDate(loan.dueAt)}
                      </p>
                      <Link href={`/panel/prestamos/nuevo?lector=${loan.reader.id}`} className="btn-outline btn-sm">
                        {t("panel.loans.gestionar")}
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </PageTransition>
  );
}
