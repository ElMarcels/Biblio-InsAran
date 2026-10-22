"use client";

import { useActionState } from "react";

import { sendOverdueRemindersAction } from "@/lib/actions/notifications";
import { initialActionState } from "@/lib/validation";

import { useT } from "../i18n/LocaleProvider";

/**
 * Envía el aviso de retraso a todas las personas con préstamos vencidos.
 * Cada clic manda un correo nuevo: la biblioteca decide cuándo hacerlo.
 */
export function SendOverdueRemindersButton() {
  const t = useT();
  const [state, formAction, pending] = useActionState(
    sendOverdueRemindersAction,
    initialActionState,
  );

  return (
    <form action={formAction} className="flex flex-col items-end gap-1.5">
      <button type="submit" disabled={pending} className="btn-outline btn-sm">
        {pending ? t("panel.loans.enviandoAvisos") : t("panel.loans.enviarAvisosDeRetraso")}
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
