"use client";

import { useActionState, useState } from "react";

import { deleteCollectionAction } from "@/lib/actions/collections";
import { initialActionState } from "@/lib/validation";

import { useT } from "../i18n/LocaleProvider";

/**
 * Borrado de una lista con confirmación en dos pasos. Solo el dueño puede
 * ejecutarlo; el servidor lo verifica de todos modos.
 */
export function DeleteCollectionButton({
  collectionId,
  name,
}: {
  collectionId: string;
  name: string;
}) {
  const t = useT();
  const [state, formAction, pending] = useActionState(
    deleteCollectionAction,
    initialActionState,
  );
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="btn-outline text-danger"
        aria-label={t("panel.collections.borrarTitle", { title: name })}
      >
        {t("panel.collections.borrarLista")}
      </button>
    );
  }

  return (
    <form action={formAction} className="inline-flex flex-wrap items-center gap-1.5">
      <input type="hidden" name="id" value={collectionId} />
      <span className="text-[12px] font-semibold text-danger">{t("panel.collections.seguro")}</span>
      <button
        type="submit"
        disabled={pending}
        className="btn-danger btn-sm"
        aria-label={t("panel.collections.confirmarBorrado")}
      >
        {pending ? "…" : t("panel.collections.siBorrar")}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="btn-ghost btn-sm"
        aria-label={t("panel.collections.cancelar")}
      >
        {t("panel.collections.cancelar")}
      </button>
      {state.status === "error" && state.message ? (
        <span className="error-text">{t(state.message, state.messageParams)}</span>
      ) : null}
    </form>
  );
}
