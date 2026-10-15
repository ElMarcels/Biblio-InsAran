"use client";

import { useActionState, useState } from "react";

import { deleteBookAction } from "@/lib/actions/books";
import { initialActionState } from "@/lib/validation";

import { useT } from "./i18n/LocaleProvider";

/**
 * Borrado con confirmación en dos pasos, sin ventanas emergentes del navegador.
 * Puede ejecutarlo cualquier cuenta con sesión (dueño o editor); el servidor lo
 * verifica de todos modos.
 */
export function DeleteBookButton({
  bookId,
  title,
  compact = false,
}: {
  bookId: string;
  title: string;
  compact?: boolean;
}) {
  const t = useT();
  const [state, formAction, pending] = useActionState(deleteBookAction, initialActionState);
  const [confirming, setConfirming] = useState(false);

  if (state.status === "success") {
    return <span className="text-[12px] font-semibold text-ok">{t("Borrado")}</span>;
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className={compact ? "btn-outline btn-sm text-danger" : "btn-outline text-danger"}
        aria-label={t("Borrar «{title}»", { title })}
      >
        {t("Borrar")}
      </button>
    );
  }

  return (
    <form action={formAction} className="inline-flex flex-wrap items-center gap-1.5">
      <input type="hidden" name="id" value={bookId} />
      <span className="text-[12px] font-semibold text-danger">{t("¿Seguro?")}</span>
      <button
        type="submit"
        disabled={pending}
        className="btn-danger btn-sm"
        aria-label={t("Confirmar borrado")}
      >
        {pending ? "…" : t("Sí, borrar")}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="btn-ghost btn-sm"
        aria-label={t("Cancelar")}
      >
        {t("Cancelar")}
      </button>
      {state.status === "error" && state.message ? (
        <span className="error-text">{state.message}</span>
      ) : null}
    </form>
  );
}
