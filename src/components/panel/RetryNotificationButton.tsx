"use client";

import { useActionState } from "react";

import { retryNotificationAction } from "@/lib/actions/notifications";
import { initialActionState } from "@/lib/validation";

import { useT } from "../i18n/LocaleProvider";

/** Reintenta el envío de un aviso concreto de la bandeja de salida. */
export function RetryNotificationButton({
  notificationId,
}: {
  notificationId: string;
}) {
  const t = useT();
  const [state, formAction, pending] = useActionState(
    retryNotificationAction,
    initialActionState,
  );

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="id" value={notificationId} />
      <button type="submit" disabled={pending} className="btn-outline btn-sm">
        {pending ? t("panel.outbox.resending") : t("panel.outbox.resend")}
      </button>
      {state.status !== "idle" && state.message ? (
        <span
          className={
            state.status === "error"
              ? "error-text max-w-[260px] text-left"
              : "max-w-[260px] text-left text-[12px] font-semibold text-ok"
          }
        >
          {t(state.message, state.messageParams)}
        </span>
      ) : null}
    </form>
  );
}
