"use client";

import { useActionState } from "react";

import {
  cancelReservationAction,
  fulfillReservationAction,
} from "@/lib/actions/loans";
import { initialActionState } from "@/lib/validation";

import { useT } from "../i18n/LocaleProvider";

/** Sirve una reserva: registra el préstamo y la cierra. */
export function FulfillReservationButton({ reservationId }: { reservationId: string }) {
  const t = useT();
  const [state, formAction, pending] = useActionState(
    fulfillReservationAction,
    initialActionState,
  );

  return (
    <form action={formAction} className="inline-flex flex-col items-end gap-1">
      <input type="hidden" name="id" value={reservationId} />
      <button type="submit" disabled={pending} className="btn-primary btn-sm">
        {pending ? "…" : t("panel.reservations.servir")}
      </button>
      {state.status === "success" && state.message ? (
        <span className="text-[12px] font-semibold text-ok">{t(state.message, state.messageParams)}</span>
      ) : null}
      {state.status === "error" && state.message ? (
        <span className="error-text">{t(state.message, state.messageParams)}</span>
      ) : null}
    </form>
  );
}

/** Anula una reserva pendiente. */
export function CancelReservationButton({ reservationId }: { reservationId: string }) {
  const t = useT();
  const [state, formAction, pending] = useActionState(
    cancelReservationAction,
    initialActionState,
  );

  if (state.status === "success") {
    return (
      <span className="text-[12px] font-semibold text-ink-faint">{t("panel.reservations.anulada")}</span>
    );
  }

  return (
    <form action={formAction} className="inline-flex flex-col items-end gap-1">
      <input type="hidden" name="id" value={reservationId} />
      <button type="submit" disabled={pending} className="btn-ghost btn-sm text-danger">
        {pending ? "…" : t("panel.reservations.anular")}
      </button>
      {state.status === "error" && state.message ? (
        <span className="error-text">{t(state.message, state.messageParams)}</span>
      ) : null}
    </form>
  );
}
