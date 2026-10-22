"use client";

import { useActionState, useState } from "react";

import {
  approvePurchaseSuggestionAction,
  rejectPurchaseSuggestionAction,
} from "@/lib/actions/purchases";
import { CATEGORIES } from "@/lib/catalog";
import { initialActionState } from "@/lib/validation";

import { Notice } from "../Notice";
import { useT } from "../i18n/LocaleProvider";
import { Field, inputClass } from "../forms/Field";

/**
 * Aprueba una solicitud de compra: el título entra en el catálogo.
 * El personal puede retocar la categoría y los ejemplares antes de aprobar.
 */
export function ApprovePurchaseSuggestionButton({
  suggestionId,
  title,
}: {
  suggestionId: string;
  title: string;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    approvePurchaseSuggestionAction,
    initialActionState,
  );

  if (state.status === "success") {
    return (
      <span className="text-[12px] font-semibold text-ok">
        {t("actions.purchaseSuggestionApproved", { title })}
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="btn-primary btn-sm"
        >
          {t("panel.suggestions.aprobar")}
        </button>
      ) : (
        <form
          action={formAction}
          className="flex w-72 flex-col gap-2.5 border-2 border-line bg-surface p-3"
        >
          <input type="hidden" name="id" value={suggestionId} />

          <Field label="panel.suggestions.categoria" htmlFor={`category-${suggestionId}`}>
            <select
              id={`category-${suggestionId}`}
              name="category"
              className={inputClass()}
              defaultValue="Referencia"
            >
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </Field>

          <Field label="panel.suggestions.ejemplares" htmlFor={`copies-${suggestionId}`}>
            <input
              id={`copies-${suggestionId}`}
              name="copies"
              type="number"
              min={1}
              max={99}
              defaultValue={1}
              className={inputClass()}
            />
          </Field>

          <Field label="panel.suggestions.nota" htmlFor={`notes-${suggestionId}`}>
            <input
              id={`notes-${suggestionId}`}
              name="notes"
              className={inputClass()}
              maxLength={500}
            />
          </Field>

          {state.status === "error" && state.message ? (
            <Notice tone="danger">{t(state.message, state.messageParams)}</Notice>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <button type="submit" disabled={pending} className="btn-primary btn-sm">
              {pending ? "…" : t("panel.suggestions.aprobarYAnadir")}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="btn-ghost btn-sm"
            >
              {t("forms.collections.cancelar")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

/** Descarta una solicitud de compra: el título no entra en el catálogo. */
export function RejectPurchaseSuggestionButton({
  suggestionId,
  title,
}: {
  suggestionId: string;
  title: string;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    rejectPurchaseSuggestionAction,
    initialActionState,
  );

  if (state.status === "success") {
    return (
      <span className="text-[12px] font-semibold text-ink-faint">
        {t("actions.purchaseSuggestionRejected")}
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="btn-ghost btn-sm text-danger"
        >
          {t("panel.suggestions.descartar")}
        </button>
      ) : (
        <form
          action={formAction}
          className="flex w-72 flex-col gap-2.5 border-2 border-line bg-surface p-3"
        >
          <input type="hidden" name="id" value={suggestionId} />

          <Field label="panel.suggestions.nota" htmlFor={`reject-${suggestionId}`}>
            <input
              id={`reject-${suggestionId}`}
              name="notes"
              className={inputClass()}
              maxLength={500}
            />
          </Field>

          {state.status === "error" && state.message ? (
            <Notice tone="danger">{t(state.message, state.messageParams)}</Notice>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <button type="submit" disabled={pending} className="btn-outline btn-sm text-danger">
              {pending ? "…" : t("panel.suggestions.descartarTitle", { title })}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="btn-ghost btn-sm"
            >
              {t("forms.collections.cancelar")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
