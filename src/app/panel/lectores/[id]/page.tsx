import Link from "next/link";
import { notFound } from "next/navigation";

import { CountUp } from "@/components/CountUp";
import { Notice } from "@/components/Notice";
import { PageTransition } from "@/components/PageTransition";
import { ReaderForm } from "@/components/forms/ReaderForm";
import { ReaderSuspensionForm } from "@/components/forms/ReaderSuspensionForm";
import { ActivityChart, type ActivityMonth } from "@/components/panel/ActivityChart";
import { RenewLoanButton, ReturnLoanButton } from "@/components/panel/LoanRowActions";
import {
  CancelReservationButton,
  FulfillReservationButton,
} from "@/components/panel/ReservationRowActions";
import { requireUser } from "@/lib/auth";
import { DEFAULT_LOAN_DAYS } from "@/lib/constants";
import { daysLate, formatDate, isPermanentSuspension } from "@/lib/format";
import { LOCALE_TAGS } from "@/lib/i18n/config";
import { getLocale, getT } from "@/lib/i18n/server";
import { isOverdue, isSuspended } from "@/lib/library";
import { prisma } from "@/lib/prisma";
import { reservationStatusKey } from "@/lib/labels";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("panel.readers.fichaDelLector") };
}

type Params = Promise<{ id: string }>;

export default async function ReaderDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser();
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  const { id } = await params;
  const sp = await searchParams;
  const aviso = Array.isArray(sp.aviso) ? sp.aviso[0] : sp.aviso;
  const sancionar = sp.sancionar === "1";
  const lateDays = Math.max(
    1,
    Number.parseInt(
      (Array.isArray(sp.dias) ? sp.dias[0] : sp.dias) ?? "1",
      10,
    ) || 1,
  );

  const reader = await prisma.reader.findUnique({
    where: { id },
    include: {
      loans: {
        include: { book: { select: { id: true, title: true, author: true } } },
        orderBy: [{ returnedAt: "asc" }, { dueAt: "asc" }],
      },
      reservations: {
        include: { book: { select: { id: true, title: true, author: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!reader) notFound();

  const activeLoans = reader.loans.filter((loan) => loan.returnedAt === null);
  const returnedLoans = reader.loans.filter((loan) => loan.returnedAt !== null);
  const activeReservations = reader.reservations.filter(
    (reservation) => reservation.status === "ACTIVE",
  );
  const pastReservations = reader.reservations.filter(
    (reservation) => reservation.status !== "ACTIVE",
  );

  const suspended = isSuspended(reader);
  const permanent = isPermanentSuspension(reader.suspendedUntil);
  const overdueLoans = activeLoans.filter((loan) => isOverdue(loan)).length;

  // Suspensión permanente: se muestra como «Permanente» en lugar de una fecha.
  const suspendedLabel = permanent
    ? t("panel.readers.permanente")
    : formatDate(reader.suspendedUntil);

  // Devoluciones que volvieron fuera de plazo (histórico completo).
  const lateReturns = returnedLoans.filter(
    (loan) => daysLate(loan.dueAt, loan.returnedAt) > 0,
  ).length;

  // Actividad de los últimos 12 meses (incluido el actual).
  const monthFormatter = new Intl.DateTimeFormat(LOCALE_TAGS[locale], {
    month: "short",
  });
  const now = new Date();
  const monthDates = Array.from({ length: 12 }, (_, index) =>
    new Date(now.getFullYear(), now.getMonth() - (11 - index), 1),
  );
  const keyOf = (date: Date) => `${date.getFullYear()}-${date.getMonth()}`;
  const slotByKey = new Map(
    monthDates.map((date, index) => [keyOf(date), index]),
  );
  const months: ActivityMonth[] = monthDates.map((date) => ({
    label: monthFormatter.format(date).replace(/\./g, ""),
    year: date.getFullYear(),
    loans: 0,
    returns: 0,
  }));
  for (const loan of reader.loans) {
    const loanSlot = slotByKey.get(keyOf(loan.loanedAt));
    if (loanSlot !== undefined) months[loanSlot].loans += 1;
    if (loan.returnedAt) {
      const returnSlot = slotByKey.get(keyOf(loan.returnedAt));
      if (returnSlot !== undefined) months[returnSlot].returns += 1;
    }
  }

  return (
    <PageTransition>
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <nav aria-label={t("panel.readers.migasDePan")} className="text-[13px] text-ink-faint">
        <Link href="/panel/lectores" className="font-semibold text-ink underline underline-offset-2">
          {t("panel.readers.lectores")}
        </Link>
        <span className="px-2">/</span>
        <span>{reader.fullName}</span>
      </nav>

      {aviso === "editado" ? (
        <Notice tone="success">{t("panel.readers.losCambiosSeHanGuardado")}</Notice>
      ) : null}

      {suspended ? (
        <Notice tone="danger">
          {permanent
            ? t("panel.readers.prestamoSuspendidoPermanente")
            : t("panel.readers.prestamoSuspendidoHastaElDate", {
                date: suspendedLabel,
              })}
          {reader.suspensionReason ? ` ${reader.suspensionReason}` : ""}
        </Notice>
      ) : null}

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-[28px] font-bold">{reader.fullName}</h2>
          <p className="mt-1.5 text-[14px] text-ink-soft">
            {[
              reader.cardNumber ? t("panel.readers.carneCard", { card: reader.cardNumber }) : null,
              reader.groupName,
              reader.email,
              reader.phone,
            ]
              .filter(Boolean)
              .join(" · ") || t("panel.readers.sinDatosDeContacto")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {suspended ? (
            <span className="tag-accent">{t("panel.readers.suspendido")}</span>
          ) : null}
          <span className={reader.active ? "tag-muted" : "tag-accent"}>
            {reader.active ? t("panel.readers.activo") : t("panel.readers.dadoDeBaja")}
          </span>
        </div>
      </header>

      <section className="border-2 border-line bg-surface p-6">
        <h3 className="font-display text-[18px] font-semibold">{t("panel.readers.datosDeLaPersona")}</h3>
        <div className="mt-4">
          <ReaderForm
            mode="edit"
            values={{
              id: reader.id,
              fullName: reader.fullName,
              cardNumber: reader.cardNumber ?? "",
              groupName: reader.groupName ?? "",
              email: reader.email ?? "",
              phone: reader.phone ?? "",
              notes: reader.notes ?? "",
            }}
          />
        </div>
      </section>

      <section className="border-2 border-line bg-surface p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-display text-[18px] font-semibold">
            {t("panel.readers.prestamoYSanciones")}
          </h3>
          {suspended ? (
            <span className="text-[13px] font-semibold text-danger">
              {permanent
                ? t("panel.readers.suspendidoPermanente")
                : t("panel.readers.suspendidoHastaElDate", {
                    date: suspendedLabel,
                  })}
            </span>
          ) : (
            <span className="text-[13px] text-ink-faint">
              {t("panel.readers.sinSuspensionVigente")}
            </span>
          )}
        </div>
        <p className="mt-1.5 text-[13px] text-ink-soft">
          {t(
            "panel.readers.unLectorSuspendidoNoPuedeLlevarseNuevosLibrosHastaLaFechaIndicad",
          )}
        </p>
        <div className="mt-4 flex flex-col gap-4">
          {sancionar ? (
            <Notice tone="warning">
              {t("panel.readers.avisoSancionPorRetraso", { days: lateDays })}
            </Notice>
          ) : null}
          <ReaderSuspensionForm
            readerId={reader.id}
            suspended={suspended}
            reason={
              reader.suspensionReason ??
              (sancionar
                ? t("forms.readers.motivoDevolucionTardia", { days: lateDays })
                : null)
            }
          />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="font-display text-[20px] font-semibold">
          {t("panel.readers.actividadDeLosUltimos12Meses")}
        </h3>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { key: "total" as const, label: t("panel.readers.totalPrestamos"), value: reader.loans.length },
            { key: "active" as const, label: t("panel.readers.enCurso"), value: activeLoans.length },
            { key: "returned" as const, label: t("panel.readers.devueltos"), value: returnedLoans.length },
            { key: "late" as const, label: t("panel.readers.conRetraso"), value: lateReturns },
          ].map((tile, index) => (
            <div
              key={tile.key}
              className="anim-row flex flex-col gap-1 border-2 border-line bg-surface p-4"
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <span className="micro">{tile.label}</span>
              <span
                className={`font-display text-[30px] font-bold tabular-nums ${
                  tile.key === "late" && tile.value > 0 ? "text-danger" : "text-ink"
                }`}
              >
                <CountUp value={tile.value} />
              </span>
            </div>
          ))}
        </div>

        {reader.loans.length > 0 ? (
          <ActivityChart
            months={months}
            loansLabel={t("panel.readers.leyendaPrestamos")}
            returnsLabel={t("panel.readers.leyendaDevoluciones")}
          />
        ) : (
          <p className="border-2 border-dashed border-hairline bg-surface p-6 text-center text-[14px] text-ink-soft">
            {t("panel.readers.todaviaNoHayActividad")}
          </p>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h3 className="font-display text-[20px] font-semibold">
            {t("panel.readers.prestamosEnCursoN", { n: activeLoans.length })}
            {overdueLoans > 0
              ? t("panel.readers.nVencidos", { n: overdueLoans })
              : ""}
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/panel/prestamos/nuevo" className="btn-outline btn-sm">
              {t("panel.readers.registrarPrestamo")}
            </Link>
            <a href={`/panel/lectores/${reader.id}/export`} className="btn-outline btn-sm">
              {t("panel.readers.exportarHistorialCSV")}
            </a>
          </div>
        </div>

        {activeLoans.length === 0 ? (
          <p className="border-2 border-dashed border-hairline bg-surface p-6 text-center text-[14px] text-ink-soft">
            {t("panel.readers.estaPersonaNoTienePrestamosActivos")}
          </p>
        ) : (
          <div className="overflow-x-auto border-2 border-line bg-surface">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr className="border-b-2 border-line bg-paper">
                  <th scope="col" className="px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide">{t("panel.readers.libro")}</th>
                  <th scope="col" className="px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide">{t("panel.readers.prestado")}</th>
                  <th scope="col" className="px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide">{t("panel.readers.devolverAntesDe")}</th>
                  <th scope="col" className="px-4 py-2.5 text-right text-[12px] font-semibold uppercase tracking-wide">{t("panel.readers.accion")}</th>
                </tr>
              </thead>
              <tbody>
                {activeLoans.map((loan) => {
                  const overdue = isOverdue(loan);
                  return (
                    <tr key={loan.id} className="border-b border-hairline last:border-b-0 align-top">
                      <td className="px-4 py-3">
                        <Link href={`/libro/${loan.book.id}`} className="font-semibold hover:text-accent">
                          {loan.book.title}
                        </Link>
                        <p className="text-[13px] text-ink-faint">{loan.book.author}</p>
                      </td>
                      <td className="px-4 py-3 text-[13px] tabular-nums text-ink-soft">
                        {formatDate(loan.loanedAt)}
                      </td>
                      <td className="px-4 py-3 text-[13px] tabular-nums">
                        <span className={overdue ? "font-semibold text-danger" : undefined}>
                          {formatDate(loan.dueAt)}
                          {overdue ? t("panel.readers.vencido") : ""}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-start justify-end gap-1.5">
                          <RenewLoanButton loanId={loan.id} days={DEFAULT_LOAN_DAYS} />
                          <ReturnLoanButton loanId={loan.id} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="font-display text-[20px] font-semibold">
          {t("panel.readers.reservasPendientesN", { n: activeReservations.length })}
        </h3>
        {activeReservations.length === 0 ? (
          <p className="border-2 border-dashed border-hairline bg-surface p-6 text-center text-[14px] text-ink-soft">
            {t("panel.readers.sinReservasPendientes")}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {activeReservations.map((reservation) => (
              <li
                key={reservation.id}
                className="flex flex-wrap items-center justify-between gap-3 border-2 border-line bg-surface px-4 py-3"
              >
                <div>
                  <Link href={`/libro/${reservation.book.id}`} className="font-semibold hover:text-accent">
                    {reservation.book.title}
                  </Link>
                  <p className="text-[13px] text-ink-faint">
                    {t("panel.readers.reservadoElDate", { date: formatDate(reservation.createdAt) })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <FulfillReservationButton reservationId={reservation.id} />
                  <CancelReservationButton reservationId={reservation.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {returnedLoans.length > 0 || pastReservations.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h3 className="font-display text-[20px] font-semibold">
            {t("panel.readers.historialDePrestamosYReservas")}
          </h3>
          <div className="overflow-x-auto border-2 border-line bg-surface">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className="border-b-2 border-line bg-paper">
                  <th scope="col" className="px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide">{t("panel.readers.tipo")}</th>
                  <th scope="col" className="px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide">{t("panel.readers.libro")}</th>
                  <th scope="col" className="px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide">{t("panel.readers.fecha")}</th>
                  <th scope="col" className="px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide">{t("panel.readers.cierre")}</th>
                  <th scope="col" className="px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide">{t("panel.readers.estado")}</th>
                </tr>
              </thead>
              <tbody>
                {returnedLoans.map((loan) => {
                  const late = daysLate(loan.dueAt, loan.returnedAt);
                  return (
                    <tr key={loan.id} className="border-b border-hairline last:border-b-0">
                      <td className="px-4 py-3 text-[13px] text-ink-soft">{t("panel.readers.prestamo")}</td>
                      <td className="px-4 py-3">
                        <Link href={`/libro/${loan.book.id}`} className="font-semibold hover:text-accent">
                          {loan.book.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-[13px] tabular-nums text-ink-soft">
                        {formatDate(loan.loanedAt)}
                      </td>
                      <td className="px-4 py-3 text-[13px] tabular-nums text-ink-soft">
                        {formatDate(loan.returnedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex flex-wrap items-center gap-1.5">
                          <span className="tag-muted">{t("panel.readers.devuelto")}</span>
                          {late > 0 ? (
                            <span
                              className="tag-warn"
                              title={t("panel.readers.retrasoNDias", { days: late })}
                            >
                              +{late}
                            </span>
                          ) : null}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {pastReservations.map((reservation) => (
                  <tr key={reservation.id} className="border-b border-hairline last:border-b-0">
                    <td className="px-4 py-3 text-[13px] text-ink-soft">{t("panel.readers.reserva")}</td>
                    <td className="px-4 py-3">
                      <Link href={`/libro/${reservation.book.id}`} className="font-semibold hover:text-accent">
                        {reservation.book.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[13px] tabular-nums text-ink-soft">
                      {formatDate(reservation.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-[13px] tabular-nums text-ink-soft">
                      {formatDate(reservation.resolvedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="tag-muted">
                        {t(reservationStatusKey(reservation.status)) || reservation.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
    </PageTransition>
  );
}
