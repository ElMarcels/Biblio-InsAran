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
import type { TranslationKey } from "@/lib/i18n/translate";
import { reservationStatusKey } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("panel.reservations.reservas") };
}

const FLASH: Record<string, TranslationKey> = {
  creada: "panel.reservations.flashCreated",
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
        <h2 className="font-display text-[26px] font-bold">{t("panel.reservations.reservas")}</h2>
        <p className="mt-1.5 max-w-2xl text-[14px] text-ink-soft">
          {t(
            "panel.reservations.librosQueElAlumnadoOElProfesoradoQuierenPedirPrestadosYQueAhoraM",
          )}
        </p>
      </header>

      {FLASH[aviso] ? <Notice tone="success">{t(FLASH[aviso])}</Notice> : null}

      <section className="border-2 border-line bg-surface p-6">
        <h3 className="font-display text-[18px] font-semibold">{t("panel.reservations.crearUnaReserva")}</h3>
        {books.length === 0 || readers.length === 0 ? (
          <p className="mt-3 text-[14px] text-ink-soft">
            {t(
              "panel.reservations.necesitasTenerAlgunLibroEnElCatalogoYAlgunLectorDadoDeAlta",
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
          {t("panel.reservations.reservasPendientesN", { n: active.length })}
        </h3>
        {active.length === 0 ? (
          <EmptyState
            title={t("panel.reservations.sinReservasPendientes")}
            description={t("panel.reservations.cuandoAlguienReserveUnLibroQueEstaPrestadoApareceraAqui")}
          />
        ) : (
          <div className="overflow-x-auto border-2 border-line bg-surface">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <caption className="sr-only">{t("panel.reservations.reservasPendientes")}</caption>
              <thead>
                <tr className="border-b-2 border-line bg-paper">
                  <th scope="col" className="px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide">{t("panel.reservations.libro")}</th>
                  <th scope="col" className="px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide">{t("panel.reservations.lectorA")}</th>
                  <th scope="col" className="px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide">{t("panel.reservations.fijadaEl")}</th>
                  <th scope="col" className="px-4 py-2.5 text-right text-[12px] font-semibold uppercase tracking-wide">{t("panel.reservations.acciones")}</th>
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
          <h3 className="font-display text-[20px] font-semibold">{t("panel.reservations.reservasResueltas")}</h3>
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
                    {(t(reservationStatusKey(reservation.status)) || reservation.status).toLowerCase()}
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
