"use client";

import { useActionState } from "react";

import {
  readerCancelReservationAction,
  readerCreateReservationAction,
  readerRenewLoanAction,
} from "@/lib/actions/reader";
import { initialActionState } from "@/lib/validation";

import { useT } from "../i18n/LocaleProvider";

/**
 * Botones de autocervicio del área del lector/a: prorrogar un préstamo,
 * anular una reserva propia y reservar un libro desde su ficha.
 */

export function ReaderRenewButton({ loanId }: { loanId: string }) {
  const t = useT();
  const [state, formAction, pending] = useActionState(
    readerRenewLoanAction,
    initialActionState,
  );

  return (
    <form action={formAction} className="inline-flex flex-col items-end gap-1">
      <input type="hidden" name="id" value={loanId} />
      <button type="submit" disabled={pending} className="btn-outline btn-sm">
        {pending ? "…" : t("reader.renewLoan")}
      </button>
      {state.status === "success" && state.message ? (
        <span className="text-[12px] font-semibold text-ok">
          {t(state.message, state.messageParams)}
        </span>
      ) : null}
      {state.status === "error" && state.message ? (
        <span className="error-text">{t(state.message, state.messageParams)}</span>
      ) : null}
    </form>
  );
}

export function ReaderCancelReservationButton({
  reservationId,
}: {
  reservationId: string;
}) {
  const t = useT();
  const [state, formAction, pending] = useActionState(
    readerCancelReservationAction,
    initialActionState,
  );

  if (state.status === "success") {
    return (
      <span className="text-[12px] font-semibold text-ink-faint">
        {t("reader.reservationCancelled")}
      </span>
    );
  }

  return (
    <form action={formAction} className="inline-flex flex-col items-end gap-1">
      <input type="hidden" name="id" value={reservationId} />
      <button
        type="submit"
        disabled={pending}
        className="btn-ghost btn-sm text-danger"
      >
        {pending ? "…" : t("reader.cancelReservation")}
      </button>
      {state.status === "error" && state.message ? (
        <span className="error-text">{t(state.message, state.messageParams)}</span>
      ) : null}
    </form>
  );
}

/** Reserva el libro desde su ficha pública (identificado el lector/a). */
export function ReserveBookButton({ bookId }: { bookId: string }) {
  const t = useT();
  const [state, formAction, pending] = useActionState(
    readerCreateReservationAction,
    initialActionState,
  );

  if (state.status === "success") {
    return (
      <span className="tag-ok">{t("reader.reserved")}</span>
    );
  }

  return (
    <form action={formAction} className="inline-flex flex-col gap-1">
      <input type="hidden" name="bookId" value={bookId} />
      <button type="submit" disabled={pending} className="btn-primary btn-sm">
        {pending ? "…" : t("reader.reserve")}
      </button>
      {state.status === "error" && state.message ? (
        <span className="error-text">{t(state.message, state.messageParams)}</span>
      ) : null}
    </form>
  );
}
