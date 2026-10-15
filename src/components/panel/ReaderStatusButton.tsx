"use client";

import { useActionState } from "react";

import { setReaderActiveAction } from "@/lib/actions/readers";
import { initialActionState } from "@/lib/validation";

import { useT } from "../i18n/LocaleProvider";

/** Activa o desactiva un lector/a (conserva su historial de préstamos). */
export function ReaderStatusButton({
  readerId,
  active,
}: {
  readerId: string;
  active: boolean;
}) {
  const t = useT();
  const [state, formAction, pending] = useActionState(
    setReaderActiveAction,
    initialActionState,
  );

  const nextActive = !active;

  return (
    <form action={formAction} className="inline-flex flex-col items-end gap-1">
      <input type="hidden" name="id" value={readerId} />
      <input type="hidden" name="active" value={nextActive ? "1" : "0"} />
      <button
        type="submit"
        disabled={pending}
        className={
          nextActive ? "btn-outline btn-sm" : "btn-ghost btn-sm text-danger"
        }
      >
        {pending ? "…" : nextActive ? t("panel.readers.activar") : t("panel.readers.desactivar")}
      </button>
      {state.status === "error" && state.message ? (
        <span className="error-text">{t(state.message, state.messageParams)}</span>
      ) : null}
    </form>
  );
}
