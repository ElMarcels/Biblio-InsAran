"use client";

import { useActionState } from "react";

import { retryUnsentNotificationsAction } from "@/lib/actions/notifications";
import { initialActionState } from "@/lib/validation";

import { useT } from "../i18n/LocaleProvider";

/** Reintenta en lote los avisos pendientes o fallidos (máximo 10 por clic). */
export function RetryUnsentNotificationsButton({ count }: { count: number }) {
  const t = useT();
  const [state, formAction, pending] = useActionState(
    retryUnsentNotificationsAction,
    initialActionState,
  );

  return (
    <form action={formAction} className="flex flex-col items-end gap-1.5">
      <button type="submit" disabled={pending || count === 0} className="btn-outline btn-sm">
        {pending
          ? t("panel.outbox.retrying")
          : t("panel.outbox.retryAll", { n: count })}
      </button>
      {state.status !== "idle" && state.message ? (
        <span
          className={
            state.status === "error"
              ? "error-text max-w-xs text-right"
              : "max-w-xs text-right text-[12px] font-semibold text-ok"
          }
        >
          {t(state.message, state.messageParams)}
        </span>
      ) : null}
    </form>
  );
}
