import Link from "next/link";
import { notFound } from "next/navigation";

import { Notice } from "@/components/Notice";
import { ReaderForm } from "@/components/forms/ReaderForm";
import { ReturnLoanButton } from "@/components/panel/LoanRowActions";
import {
  CancelReservationButton,
  FulfillReservationButton,
} from "@/components/panel/ReservationRowActions";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { isOverdue } from "@/lib/library";
import { prisma } from "@/lib/prisma";
import { reservationStatusLabel } from "@/lib/labels";

export const metadata = { title: "Ficha del lector" };

type Params = Promise<{ id: string }>;

export default async function ReaderDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const aviso = Array.isArray(sp.aviso) ? sp.aviso[0] : sp.aviso;

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

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <nav aria-label="Migas de pan" className="text-[13px] text-ink-faint">
        <Link href="/panel/lectores" className="font-semibold text-ink underline underline-offset-2">
          Lectores
        </Link>
        <span className="px-2">/</span>
        <span>{reader.fullName}</span>
      </nav>

      {aviso === "editado" ? (
        <Notice tone="success">Los cambios se han guardado.</Notice>
      ) : null}

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-[28px] font-bold">{reader.fullName}</h2>
          <p className="mt-1.5 text-[14px] text-ink-soft">
            {[
              reader.cardNumber ? `Carné ${reader.cardNumber}` : null,
              reader.groupName,
              reader.email,
              reader.phone,
            ]
              .filter(Boolean)
              .join(" · ") || "Sin datos de contacto"}
          </p>
        </div>
        <span className={reader.active ? "tag-muted" : "tag-accent"}>
          {reader.active ? "Activo" : "Dado de baja"}
        </span>
      </header>

      <section className="border-2 border-line bg-surface p-6">
        <h3 className="font-display text-[18px] font-semibold">Datos de la persona</h3>
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

      <section className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-display text-[20px] font-semibold">
            Préstamos en curso ({activeLoans.length})
          </h3>
          <Link href="/panel/prestamos/nuevo" className="btn-outline btn-sm">
            Registrar préstamo
          </Link>
        </div>

        {activeLoans.length === 0 ? (
          <p className="border-2 border-dashed border-hairline bg-surface p-6 text-center text-[14px] text-ink-soft">
            Esta persona no tiene préstamos activos.
          </p>
        ) : (
          <div className="overflow-x-auto border-2 border-line bg-surface">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr className="border-b-2 border-line bg-paper">
                  <th scope="col" className="px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide">Libro</th>
                  <th scope="col" className="px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide">Prestado</th>
                  <th scope="col" className="px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide">Devolver antes de</th>
                  <th scope="col" className="px-4 py-2.5 text-right text-[12px] font-semibold uppercase tracking-wide">Acción</th>
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
                          {overdue ? " (vencido)" : ""}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end">
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
          Reservas pendientes ({activeReservations.length})
        </h3>
        {activeReservations.length === 0 ? (
          <p className="border-2 border-dashed border-hairline bg-surface p-6 text-center text-[14px] text-ink-soft">
            Sin reservas pendientes.
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
                    Reservado el {formatDate(reservation.createdAt)}
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
          <h3 className="font-display text-[20px] font-semibold">Historial</h3>
          <ul className="flex flex-col gap-1.5 text-[14px]">
            {returnedLoans.map((loan) => (
              <li
                key={loan.id}
                className="flex flex-wrap items-baseline justify-between gap-2 border-b border-hairline py-1.5"
              >
                <span>
                  <Link href={`/libro/${loan.book.id}`} className="font-semibold hover:text-accent">
                    {loan.book.title}
                  </Link>{" "}
                  <span className="text-ink-faint">· devuelto</span>
                </span>
                <span className="text-[13px] tabular-nums text-ink-faint">
                  {formatDate(loan.returnedAt)}
                </span>
              </li>
            ))}
            {pastReservations.map((reservation) => (
              <li
                key={reservation.id}
                className="flex flex-wrap items-baseline justify-between gap-2 border-b border-hairline py-1.5"
              >
                <span>
                  <Link href={`/libro/${reservation.book.id}`} className="font-semibold hover:text-accent">
                    {reservation.book.title}
                  </Link>{" "}
                  <span className="text-ink-faint">
                    · reserva {reservationStatusLabel(reservation.status).toLowerCase()}
                  </span>
                </span>
                <span className="text-[13px] tabular-nums text-ink-faint">
                  {formatDate(reservation.resolvedAt)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
