import Link from "next/link";

import { EmptyState } from "@/components/EmptyState";
import { Notice } from "@/components/Notice";
import { ReservationForm } from "@/components/forms/ReservationForm";
import {
  CancelReservationButton,
  FulfillReservationButton,
} from "@/components/panel/ReservationRowActions";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { reservationStatusLabel } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Reservas") };
}

const FLASH: Record<string, string> = {
  creada: "La reserva se ha creado.",
};

function one(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser();
  const t = await getT();
  const params = await searchParams;
  const aviso = one(params.aviso);

  const [books, readers, active, resolved] = await Promise.all([
    prisma.book.findMany({
      orderBy: [{ title: "asc" }],
      select: { id: true, title: true, author: true },
    }),
    prisma.reader.findMany({
      where: { active: true },
      orderBy: [{ fullName: "asc" }],
      select: { id: true, fullName: true, groupName: true },
    }),
    prisma.reservation.findMany({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
      include: {
        book: { select: { id: true, title: true, author: true, copies: true } },
        reader: { select: { id: true, fullName: true, groupName: true } },
      },
    }),
    prisma.reservation.findMany({
      where: { status: { not: "ACTIVE" } },
      orderBy: { resolvedAt: "desc" },
      take: 30,
      include: {
        book: { select: { id: true, title: true } },
        reader: { select: { id: true, fullName: true } },
      },
    }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h2 className="font-display text-[26px] font-bold">{t("Reservas")}</h2>
        <p className="mt-1.5 max-w-2xl text-[14px] text-ink-soft">
          {t(
            "Libros que el alumnado o el profesorado quieren pedir prestados y que ahora mismo no están disponibles. Cuando quieras, puedes servir una reserva para convertirla en préstamo.",
          )}
        </p>
      </header>

      {FLASH[aviso] ? <Notice tone="success">{t(FLASH[aviso])}</Notice> : null}

      <section className="border-2 border-line bg-surface p-6">
        <h3 className="font-display text-[18px] font-semibold">{t("Crear una reserva")}</h3>
        {books.length === 0 || readers.length === 0 ? (
          <p className="mt-3 text-[14px] text-ink-soft">
            {t(
              "Necesitas tener algún libro en el catálogo y algún lector dado de alta.",
            )}
          </p>
        ) : (
          <div className="mt-4">
            <ReservationForm books={books} readers={readers} />
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="font-display text-[20px] font-semibold">
          {t("Reservas pendientes ({n})", { n: active.length })}
        </h3>
        {active.length === 0 ? (
          <EmptyState
            title={t("Sin reservas pendientes")}
            description={t("Cuando alguien reserve un libro que está prestado, aparecerá aquí.")}
          />
        ) : (
          <div className="overflow-x-auto border-2 border-line bg-surface">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <caption className="sr-only">{t("Reservas pendientes")}</caption>
              <thead>
                <tr className="border-b-2 border-line bg-paper">
                  <th scope="col" className="px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide">{t("Libro")}</th>
                  <th scope="col" className="px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide">{t("Lector/a")}</th>
                  <th scope="col" className="px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide">{t("Fijada el")}</th>
                  <th scope="col" className="px-4 py-2.5 text-right text-[12px] font-semibold uppercase tracking-wide">{t("Acciones")}</th>
                </tr>
              </thead>
              <tbody>
                {active.map((reservation) => (
                  <tr key={reservation.id} className="border-b border-hairline last:border-b-0 align-top">
                    <td className="px-4 py-3">
                      <Link href={`/libro/${reservation.book.id}`} className="font-semibold hover:text-accent">
                        {reservation.book.title}
                      </Link>
                      <p className="text-[13px] text-ink-faint">{reservation.book.author}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/panel/lectores/${reservation.reader.id}`} className="font-semibold hover:text-accent">
                        {reservation.reader.fullName}
                      </Link>
                      {reservation.reader.groupName ? (
                        <p className="text-[13px] text-ink-faint">{reservation.reader.groupName}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-[13px] tabular-nums text-ink-soft">
                      {formatDate(reservation.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-start justify-end gap-1.5">
                        <FulfillReservationButton reservationId={reservation.id} />
                        <CancelReservationButton reservationId={reservation.id} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {resolved.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h3 className="font-display text-[20px] font-semibold">{t("Reservas resueltas")}</h3>
          <ul className="flex flex-col gap-1.5 text-[14px]">
            {resolved.map((reservation) => (
              <li
                key={reservation.id}
                className="flex flex-wrap items-baseline justify-between gap-2 border-b border-hairline py-1.5"
              >
                <span>
                  <Link href={`/libro/${reservation.book.id}`} className="font-semibold hover:text-accent">
                    {reservation.book.title}
                  </Link>{" "}
                  <span className="text-ink-faint">
                    · {reservation.reader.fullName} ·{" "}
                    {t(reservationStatusLabel(reservation.status)).toLowerCase()}
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
