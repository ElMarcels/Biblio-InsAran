import Link from "next/link";

import { BookCover } from "@/components/BookCover";
import { ReturnLoanButton } from "@/components/panel/LoanRowActions";
import {
  CancelReservationButton,
  FulfillReservationButton,
} from "@/components/panel/ReservationRowActions";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { daysUntil } from "@/lib/library";
import { prisma } from "@/lib/prisma";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("panel.tasks.bandejaDeTareas") };
}

/** Cuántas filas mostramos como mucho en cada bloque. */
const LIMIT = 40;

const READER_SELECT = { select: { id: true, fullName: true, groupName: true } };
const BOOK_SELECT = { select: { id: true, title: true, author: true } };

function Block({
  title,
  count,
  description,
  children,
}: {
  title: string;
  count: number;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-2 border-line bg-surface">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b-2 border-line bg-paper px-4 py-3">
        <h3 className="font-display text-[19px] font-bold">{title}</h3>
        <span className="border-2 border-line px-2 py-0.5 text-[12px] font-bold tabular-nums">
          {count}
        </span>
        <p className="w-full text-[13px] text-ink-soft sm:w-auto sm:pl-2">{description}</p>
      </div>
      {children}
    </section>
  );
}

function EmptyBlock({ text }: { text: string }) {
  return <p className="px-4 py-6 text-center text-[13.5px] text-ink-faint">{text}</p>;
}

export default async function TasksPage() {
  await requireUser();
  const t = await getT();

  const now = new Date();
  const dayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const [overdue, dueToday, reservations, grouped] = await Promise.all([
    prisma.loan.findMany({
      where: { returnedAt: null, dueAt: { lt: now } },
      orderBy: { dueAt: "asc" },
      take: LIMIT,
      include: { book: BOOK_SELECT, reader: READER_SELECT },
    }),
    prisma.loan.findMany({
      where: { returnedAt: null, dueAt: { gte: now, lt: dayEnd } },
      orderBy: { dueAt: "asc" },
      take: LIMIT,
      include: { book: BOOK_SELECT, reader: READER_SELECT },
    }),
    prisma.reservation.findMany({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
      take: LIMIT,
      include: { book: BOOK_SELECT, reader: READER_SELECT },
    }),
    prisma.loan.groupBy({
      by: ["bookId"],
      where: { returnedAt: null },
      _count: { _all: true },
    }),
  ]);

  const onLoan = new Map(grouped.map((row) => [row.bookId, row._count._all]));
  const loanedBooks = await prisma.book.findMany({
    where: { id: { in: Array.from(onLoan.keys()) } },
    select: {
      id: true,
      title: true,
      author: true,
      category: true,
      copies: true,
      coverUrl: true,
    },
    orderBy: { title: "asc" },
  });
  const noCopies = loanedBooks.filter(
    (book) => (onLoan.get(book.id) ?? 0) >= book.copies,
  );

  const total = overdue.length + dueToday.length + reservations.length + noCopies.length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-[26px] font-bold">{t("panel.tasks.bandejaDeTareas")}</h2>
        <p className="mt-1 text-[14px] text-ink-soft">
          {t("panel.tasks.todoLoQueRequiereTuAtencionHoyEnUnaSolaPagina")}
        </p>
      </div>

      {total === 0 ? (
        <p className="border-2 border-dashed border-hairline bg-surface px-6 py-14 text-center text-[15px] text-ink-soft">
          {t("panel.tasks.noHayNadaPendienteBuenTrabajo")}
        </p>
      ) : null}

      <Block
        title={t("panel.tasks.prestamosVencidos")}
        count={overdue.length}
        description={t("panel.tasks.devolucionesQueYaDeberianHaberLlegado")}
      >
        {overdue.length === 0 ? (
          <EmptyBlock text={t("panel.tasks.noHayPrestamosVencidos")} />
        ) : (
          <ul className="divide-y divide-hairline">
            {overdue.map((loan) => {
              const late = Math.abs(daysUntil(loan.dueAt));
              return (
                <li
                  key={loan.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
                >
                  <div className="min-w-[180px] flex-1">
                    <Link
                      href={`/libro/${loan.book.id}`}
                      className="font-semibold hover:text-accent"
                    >
                      {loan.book.title}
                    </Link>
                    <p className="text-[13px] text-ink-faint">{loan.book.author}</p>
                  </div>
                  <div className="min-w-[140px]">
                    <Link
                      href={`/panel/lectores/${loan.reader.id}`}
                      className="text-[13.5px] font-semibold hover:text-accent"
                    >
                      {loan.reader.fullName}
                    </Link>
                    {loan.reader.groupName ? (
                      <p className="text-[12px] text-ink-faint">{loan.reader.groupName}</p>
                    ) : null}
                  </div>
                  <span className="text-[13px] tabular-nums text-ink-faint">
                    {formatDate(loan.dueAt)}
                  </span>
                  <span className="border-2 border-danger px-2 py-0.5 text-[12px] font-bold text-danger">
                    {late === 1 ? t("panel.tasks.oneDay") : t("panel.tasks.nDays", { n: late })}
                  </span>
                  <ReturnLoanButton loanId={loan.id} />
                </li>
              );
            })}
          </ul>
        )}
      </Block>

      <Block
        title={t("panel.tasks.vencenHoy")}
        count={dueToday.length}
        description={t("panel.tasks.tocaDevolverlasHoyMismo")}
      >
        {dueToday.length === 0 ? (
          <EmptyBlock text={t("panel.tasks.hoyNoVenceNingunPrestamo")} />
        ) : (
          <ul className="divide-y divide-hairline">
            {dueToday.map((loan) => (
              <li
                key={loan.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
              >
                <div className="min-w-[180px] flex-1">
                  <Link
                    href={`/libro/${loan.book.id}`}
                    className="font-semibold hover:text-accent"
                  >
                    {loan.book.title}
                  </Link>
                  <p className="text-[13px] text-ink-faint">{loan.book.author}</p>
                </div>
                <div className="min-w-[140px]">
                  <Link
                    href={`/panel/lectores/${loan.reader.id}`}
                    className="text-[13.5px] font-semibold hover:text-accent"
                  >
                    {loan.reader.fullName}
                  </Link>
                  {loan.reader.groupName ? (
                    <p className="text-[12px] text-ink-faint">{loan.reader.groupName}</p>
                  ) : null}
                </div>
                <ReturnLoanButton loanId={loan.id} />
              </li>
            ))}
          </ul>
        )}
      </Block>

      <Block
        title={t("panel.tasks.reservasPorServir")}
        count={reservations.length}
        description={t("panel.tasks.librosReservadosPorLectoresYLectoras")}
      >
        {reservations.length === 0 ? (
          <EmptyBlock text={t("panel.tasks.noHayReservasPendientes")} />
        ) : (
          <ul className="divide-y divide-hairline">
            {reservations.map((reservation) => (
              <li
                key={reservation.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
              >
                <div className="min-w-[180px] flex-1">
                  <Link
                    href={`/libro/${reservation.book.id}`}
                    className="font-semibold hover:text-accent"
                  >
                    {reservation.book.title}
                  </Link>
                  <p className="text-[13px] text-ink-faint">{reservation.book.author}</p>
                </div>
                <div className="min-w-[140px]">
                  <Link
                    href={`/panel/lectores/${reservation.reader.id}`}
                    className="text-[13.5px] font-semibold hover:text-accent"
                  >
                    {reservation.reader.fullName}
                  </Link>
                  {reservation.reader.groupName ? (
                    <p className="text-[12px] text-ink-faint">{reservation.reader.groupName}</p>
                  ) : null}
                </div>
                <span className="text-[13px] tabular-nums text-ink-faint">
                  {formatDate(reservation.createdAt)}
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <FulfillReservationButton reservationId={reservation.id} />
                  <CancelReservationButton reservationId={reservation.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Block>

      <Block
        title={t("panel.tasks.sinEjemplaresDisponibles")}
        count={noCopies.length}
        description={t("panel.tasks.todosSusEjemplaresEstanPrestados")}
      >
        {noCopies.length === 0 ? (
          <EmptyBlock text={t("panel.tasks.todosLosLibrosTienenAlgunEjemplarLibre")} />
        ) : (
          <ul className="divide-y divide-hairline">
            {noCopies.map((book) => (
              <li key={book.id} className="flex flex-wrap items-center gap-4 px-4 py-3">
                <span className="w-[44px] shrink-0">
                  <BookCover
                    title={book.title}
                    author={book.author}
                    category={book.category}
                    src={book.coverUrl}
                    size="sm"
                  />
                </span>
                <div className="min-w-[180px] flex-1">
                  <Link
                    href={`/libro/${book.id}`}
                    className="font-semibold hover:text-accent"
                  >
                    {book.title}
                  </Link>
                  <p className="text-[13px] text-ink-faint">{book.author}</p>
                </div>
                <span className="text-[13px] tabular-nums text-ink-soft">
                  {t("panel.tasks.nPrestadosDeTotal", {
                    n: onLoan.get(book.id) ?? book.copies,
                    total: book.copies,
                  })}
                </span>
                <Link href={`/libro/${book.id}`} className="btn-outline btn-sm">
                  {t("panel.tasks.verLaFicha")}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Block>
    </div>
  );
}
