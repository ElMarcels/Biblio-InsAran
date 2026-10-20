"use client";

import { useActionState, useState } from "react";

import { resetReaderPinAction } from "@/lib/actions/readers";
import { initialActionState } from "@/lib/validation";

import { useT } from "../i18n/LocaleProvider";

/**
 * Restablece el PIN de «Mi biblioteca» a su valor inicial y cierra todas las
 * sesiones del lector o la lectora. Confirmación en dos pasos, sin diálogos.
 */
export function ResetReaderPinButton({ readerId }: { readerId: string }) {
  const t = useT();
  const [state, formAction, pending] = useActionState(
    resetReaderPinAction,
    initialActionState,
  );
  const [confirming, setConfirming] = useState(false);

  if (state.status === "success") {
    return (
      <span className="animate-pop text-[12px] font-semibold text-ok">
        {t("panel.readers.pinRestablecido")}
      </span>
    );
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="btn-outline btn-sm"
      >
        {t("panel.readers.restablecerPin")}
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="animate-pop inline-flex flex-wrap items-center gap-1.5"
    >
      <input type="hidden" name="readerId" value={readerId} />
      <span className="text-[12px] font-semibold text-danger">
        {t("panel.readers.seguroRestablecerPin")}
      </span>
      <button type="submit" disabled={pending} className="btn-danger btn-sm">
        {pending ? "…" : t("panel.readers.siRestablecer")}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="btn-ghost btn-sm"
      >
        {t("panel.readers.cancelar")}
      </button>
      {state.status === "error" && state.message ? (
        <span className="error-text animate-shake">
          {t(state.message, state.messageParams)}
        </span>
      ) : null}
    </form>
  );
}
