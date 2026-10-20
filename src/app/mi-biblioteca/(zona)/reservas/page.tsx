import Link from "next/link";
import { redirect } from "next/navigation";

import { Notice } from "@/components/Notice";
import { PageTransition } from "@/components/PageTransition";
import { ReaderCancelReservationButton } from "@/components/reader/ReaderActions";
import { formatDate } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { isSuspended } from "@/lib/library";
import { prisma } from "@/lib/prisma";
import { requireReader } from "@/lib/reader-auth";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("reader.tabReservations") };
}

export default async function ReaderReservationsPage() {
  const session = await requireReader();
  const t = await getT();

  const reader = await prisma.reader.findUnique({ where: { id: session.id } });
  if (!reader) redirect("/mi-biblioteca");

  const reservations = await prisma.reservation.findMany({
    where: { readerId: reader.id, status: "ACTIVE" },
    include: { book: { select: { id: true, title: true, author: true } } },
    orderBy: { createdAt: "desc" },
  });

  const suspended = isSuspended(reader);

  return (
    <PageTransition>
      <div className="flex flex-col gap-6">
        <header>
          <h2 className="font-display text-[26px] font-bold">
            {t("reader.tabReservations")}
          </h2>
          <p className="mt-1.5 text-[14px] text-ink-soft">
            {t("reader.reservationsLead")}
          </p>
        </header>

        {suspended ? (
          <Notice tone="warning">{t("reader.suspendedNoReserve")}</Notice>
        ) : null}

        {reservations.length === 0 ? (
          <p className="border-2 border-dashed border-hairline bg-surface p-7 text-center text-[14px] text-ink-soft">
            {t("reader.noReservations")}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {reservations.map((reservation, index) => (
              <li
                key={reservation.id}
                className="anim-row flex flex-wrap items-center justify-between gap-4 border-2 border-line bg-surface p-4"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <div className="min-w-0">
                  <Link
                    href={`/libro/${reservation.book.id}`}
                    className="font-semibold hover:text-accent"
                  >
                    {reservation.book.title}
                  </Link>
                  <p className="text-[13px] text-ink-faint">{reservation.book.author}</p>
                  <p className="mt-1.5 text-[13px] tabular-nums text-ink-faint">
                    {t("reader.reservedOn", { date: formatDate(reservation.createdAt) })}
                  </p>
                </div>
                <ReaderCancelReservationButton reservationId={reservation.id} />
              </li>
            ))}
          </ul>
        )}

        <Notice tone="info">{t("reader.reservationHowItWorks")}</Notice>
      </div>
    </PageTransition>
  );
}
