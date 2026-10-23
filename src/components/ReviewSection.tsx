"use client";

import { useActionState, useState } from "react";

import { useT } from "@/components/i18n/LocaleProvider";
import { createOrUpdateReviewAction, deleteReviewAction } from "@/lib/actions/reviews";
import { initialActionState } from "@/lib/validation";

function Stars({ value, size = 18 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-accent" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg
          key={n}
          width={size}
          height={size}
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

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  reader: { fullName: string };
};

type Props = {
  bookId: string;
  reviews: Review[];
  average: number;
  count: number;
  canReview: boolean;
  myReview?: Review | null;
};

export function ReviewSection({
  bookId,
  reviews,
  average,
  count,
  canReview,
  myReview,
}: Props) {
  const t = useT();
  const [state, formAction, pending] = useActionState(
    createOrUpdateReviewAction,
    initialActionState,
  );
  const [deleteState, deleteAction, deleting] = useActionState(
    deleteReviewAction,
    initialActionState,
  );
  const [rating, setRating] = useState(myReview?.rating ?? 0);
  const [hover, setHover] = useState(0);

  const displayCount = myReview && !reviews.some((r) => r.id === myReview.id) ? count + 1 : count;
  const displayAverage =
    myReview && displayCount > 0 && !reviews.some((r) => r.id === myReview.id)
      ? (average * count + myReview.rating) / displayCount
      : average;

  const shown = rating || hover;

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-[26px] font-bold">{t("review.valoraciones")}</h2>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-[14px] text-ink-soft">
            {displayCount === 0 ? (
              t("review.sinValoracionesAun")
            ) : (
              <>
                <Stars value={Math.round(displayAverage)} size={16} />
                <span className="tabular-nums">
                  {displayAverage.toFixed(1)}/5 ·{" "}
                  {displayCount === 1
                    ? t("review.nValoracion", { n: displayCount })
                    : t("review.nValoraciones", { n: displayCount })}
                </span>
              </>
            )}
          </p>
        </div>
      </div>

      {canReview ? (
        <div className="mb-6 border-2 border-line bg-surface p-4">
          <form action={formAction}>
            <input type="hidden" name="bookId" value={bookId} />
            <input type="hidden" name="rating" value={rating} />
            <p className="text-[14px] font-semibold">
              {myReview
                ? t("review.actualizaTuValoracion")
                : t("review.escribeTuValoracion")}
            </p>
            <div
              className="mt-2 flex items-center gap-1"
              onMouseLeave={() => setHover(0)}
            >
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  onMouseEnter={() => setHover(value)}
                  className="p-0.5"
                  aria-label={t("review.puntuarConEstrellas", { n: value })}
                >
                  <svg
                    width="26"
                    height="26"
                    viewBox="0 0 24 24"
                    fill={shown >= value ? "currentColor" : "none"}
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className={shown >= value ? "text-accent" : "text-ink-faint"}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                    />
                  </svg>
                </button>
              ))}
            </div>
            <textarea
              name="comment"
              className="input mt-3 h-24 resize-none"
              placeholder={t("review.comentarioOpcional")}
              defaultValue={myReview?.comment ?? ""}
              maxLength={1000}
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <div>
                {state.status === "error" && state.message ? (
                  <span className="error-text">{t(state.message, state.messageParams)}</span>
                ) : state.status === "success" && state.message ? (
                  <span className="text-[13px] font-semibold text-ok">
                    {t(state.message, state.messageParams)}
                  </span>
                ) : null}
              </div>
              <button
                type="submit"
                className="btn-primary btn-sm"
                disabled={pending || rating < 1}
              >
                {pending ? "…" : myReview ? t("review.actualizar") : t("review.enviarValoracion")}
              </button>
            </div>
          </form>

          {myReview ? (
            <form action={deleteAction} className="mt-2 flex items-center justify-between gap-3 border-t border-hairline pt-2">
              <input type="hidden" name="bookId" value={bookId} />
              <span className="text-[12px] text-ink-faint">
                {deleteState.status === "error" && deleteState.message
                  ? t(deleteState.message, deleteState.messageParams)
                  : null}
              </span>
              <button
                type="submit"
                className="btn-ghost btn-sm text-danger"
                disabled={deleting}
              >
                {deleting ? "…" : t("review.eliminarValoracion")}
              </button>
            </form>
          ) : null}
        </div>
      ) : null}

      {reviews.length === 0 ? (
        <div className="border-2 border-dashed border-hairline bg-surface p-6 text-center text-[14px] text-ink-soft">
          {canReview
            ? t("review.sinValoracionesAunSeElPrimero")
            : t("reader.paraValorarDebesIniciarSesionEnMiBiblioteca")}
        </div>
      ) : (
        <ul className="border-2 border-line bg-surface">
          {reviews.map((review) => (
            <li
              key={review.id}
              className="border-b border-hairline px-4 py-3 last:border-b-0"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{review.reader.fullName}</p>
                <Stars value={review.rating} size={15} />
              </div>
              {review.comment ? (
                <p className="mt-1.5 whitespace-pre-line text-[14px] leading-relaxed text-ink-soft">
                  {review.comment}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
