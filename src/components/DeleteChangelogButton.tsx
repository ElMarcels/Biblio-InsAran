"use client";

import { useActionState, useState } from "react";

import { deleteChangelogAction } from "@/lib/actions/changelog";
import { initialActionState } from "@/lib/validation";

import { useT } from "./i18n/LocaleProvider";

/**
 * Borrado con confirmación en dos pasos de una novedad publicada, sin
 * ventanas emergentes del navegador.
 */
export function DeleteChangelogButton({ id, title }: { id: string; title: string }) {
  const t = useT();
  const [state, formAction, pending] = useActionState(
    deleteChangelogAction,
    initialActionState,
  );
  const [confirming, setConfirming] = useState(false);

  if (state.status === "success") {
    return (
      <span className="animate-pop text-[12px] font-semibold text-ok">
        {t("panel.changelog.borrada")}
      </span>
    );
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="btn-outline btn-sm text-danger"
        aria-label={t("panel.changelog.borrarTitle", { title })}
      >
        {t("panel.changelog.borrar")}
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="animate-pop inline-flex flex-wrap items-center gap-1.5"
    >
      <input type="hidden" name="id" value={id} />
      <span className="text-[12px] font-semibold text-danger">
        {t("panel.changelog.seguro")}
      </span>
      <button
        type="submit"
        disabled={pending}
        className="btn-danger btn-sm"
        aria-label={t("panel.changelog.confirmarBorrado")}
      >
        {pending ? "…" : t("panel.changelog.siBorrar")}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="btn-ghost btn-sm"
        aria-label={t("panel.changelog.cancelar")}
      >
        {t("panel.changelog.cancelar")}
      </button>
      {state.status === "error" && state.message ? (
        <span className="error-text animate-shake">{t(state.message, state.messageParams)}</span>
      ) : null}
    </form>
  );
}
