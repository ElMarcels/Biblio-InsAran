"use client";

import { useActionState } from "react";

import { setReaderSuspensionAction } from "@/lib/actions/readers";
import { initialActionState } from "@/lib/validation";

import { useT } from "../i18n/LocaleProvider";

/**
 * Levanta la suspensión del préstamo de un lector o lectora. Se usa en la
 * bandeja de tareas, para las sanciones cuyo plazo ya caducó: quitan el
 * registro pendiente sin tener que entrar en la ficha de la persona.
 */
export function LiftSuspensionButton({ readerId }: { readerId: string }) {
  const t = useT();
  const [state, formAction, pending] = useActionState(
    setReaderSuspensionAction,
    initialActionState,
  );

  if (state.status === "success" && state.message) {
    return (
      <span className="animate-pop text-[12px] font-semibold text-ok">
        {t(state.message, state.messageParams)}
      </span>
    );
  }

  return (
    <form action={formAction} className="inline-flex flex-col items-end gap-1">
      <input type="hidden" name="readerId" value={readerId} />
      <input type="hidden" name="lift" value="1" />
      <button type="submit" disabled={pending} className="btn-outline btn-sm">
        {pending ? "…" : t("forms.readers.levantarSuspension")}
      </button>
      {state.status === "error" && state.message ? (
        <span className="error-text">{t(state.message, state.messageParams)}</span>
      ) : null}
    </form>
  );
}
