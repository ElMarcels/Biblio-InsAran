import Link from "next/link";

import { DeleteReviewButton } from "@/components/panel/DeleteReviewButton";
import { EmptyState } from "@/components/EmptyState";
import { PageTransition } from "@/components/PageTransition";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("panel.reviews.resenas") };
}

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-accent" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg
          key={n}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill={value >= n ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
          />
        </svg>
      ))}
    </span>
  );
}

export default async function ReviewsPage() {
  await requireUser();
  const t = await getT();

  const reviews = await prisma.review.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      book: { select: { id: true, title: true, author: true } },
      reader: { select: { id: true, fullName: true, groupName: true } },
    },
  });

  return (
    <PageTransition>
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="font-display text-[26px] font-bold">{t("panel.reviews.resenas")}</h2>
          <p className="mt-1 text-[14px] text-ink-soft">{t("panel.reviews.lead")}</p>
        </div>

        {reviews.length === 0 ? (
          <EmptyState
            title={t("panel.reviews.sinResenas")}
            description={t("panel.reviews.cuandoElAlumnadoValoreLibrosApareceranAqui")}
          />
        ) : (
          <div className="overflow-x-auto border-2 border-line bg-surface">
            <table className="w-full min-w-[860px] border-collapse text-left">
              <caption className="sr-only">{t("panel.reviews.listadoDeResenas")}</caption>
              <thead>
                <tr className="border-b-2 border-line bg-paper">
                  <th scope="col" className="px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide">
                    {t("panel.reviews.libro")}
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide">
                    {t("panel.reviews.lectorA")}
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide">
                    {t("panel.reviews.puntuacion")}
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide">
                    {t("panel.reviews.comentario")}
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right text-[12px] font-semibold uppercase tracking-wide">
                    {t("panel.reviews.fecha")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((review, index) => (
                  <tr
                    key={review.id}
                    className="anim-row border-b border-hairline align-top last:border-b-0"
                    style={{ animationDelay: `${Math.min(index * 40, 480)}ms` }}
                  >
                    <td className="px-4 py-3">
                      <Link href={`/libro/${review.book.id}`} className="font-semibold hover:text-accent">
                        {review.book.title}
                      </Link>
                      <p className="text-[13px] text-ink-faint">{review.book.author}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/panel/lectores/${review.reader.id}`}
                        className="font-semibold hover:text-accent"
                      >
                        {review.reader.fullName}
                      </Link>
                      {review.reader.groupName ? (
                        <p className="text-[13px] text-ink-faint">{review.reader.groupName}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <Stars value={review.rating} />
                    </td>
                    <td className="max-w-[340px] px-4 py-3 text-[13px] text-ink-soft">
                      {review.comment ? (
                        <p className="whitespace-pre-line">{review.comment}</p>
                      ) : (
                        <span className="text-ink-faint">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="text-[12px] text-ink-faint">{formatDate(review.createdAt)}</p>
                      <div className="mt-1.5">
                        <DeleteReviewButton reviewId={review.id} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
