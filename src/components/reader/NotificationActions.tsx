"use client";

import { useActionState } from "react";

import {
  readerMarkAllNotificationsReadAction,
  readerMarkNotificationReadAction,
} from "@/lib/actions/notifications";
import { initialActionState } from "@/lib/validation";

import { useT } from "../i18n/LocaleProvider";

/** Marca un aviso concreto como leído. */
export function MarkNotificationReadButton({
  notificationId,
}: {
  notificationId: string;
}) {
  const t = useT();
  const [state, formAction, pending] = useActionState(
    readerMarkNotificationReadAction,
    initialActionState,
  );

  if (state.status === "success") {
    return (
      <span className="text-[12px] font-semibold text-ink-faint">
        {t("actions.notificationMarkedRead")}
      </span>
    );
  }

  return (
    <form action={formAction} className="inline-flex flex-col items-end gap-1">
      <input type="hidden" name="id" value={notificationId} />
      <button type="submit" disabled={pending} className="btn-ghost btn-sm">
        {pending ? "…" : t("reader.markAsRead")}
      </button>
      {state.status === "error" && state.message ? (
        <span className="error-text">{t(state.message, state.messageParams)}</span>
      ) : null}
    </form>
  );
}

/** Marca todos los avisos de la bandeja como leídos. */
export function MarkAllNotificationsReadButton() {
  const t = useT();
  const [state, formAction, pending] = useActionState(
    readerMarkAllNotificationsReadAction,
    initialActionState,
  );

  return (
    <form action={formAction} className="inline-flex flex-col items-end gap-1">
      <button type="submit" disabled={pending} className="btn-outline btn-sm">
        {pending ? "…" : t("reader.markAllAsRead")}
      </button>
      {state.status === "error" && state.message ? (
        <span className="error-text">{t(state.message, state.messageParams)}</span>
      ) : null}
    </form>
  );
}
