"use client";

import { useActionState } from "react";

import type { TranslationKey } from "@/lib/i18n/translate";
import { initialActionState, type ActionState } from "@/lib/validation";

import { Notice } from "../Notice";
import { SubmitButton } from "../SubmitButton";
import { useT } from "../i18n/LocaleProvider";
import { Field, inputClass } from "./Field";

/** Server Action que crea una solicitud de compra. */
export type PurchaseSuggestionAction = (
  prev: ActionState,
  formData: FormData,
) => Promise<ActionState>;

/**
 * Formulario para pedir un título que todavía no está en el catálogo.
 *
 * El mismo formulario sirve para el formulario público, para el área de
 * «Mi biblioteca» y para el panel: lo único que cambia son los campos de
 * contacto, que solo se piden cuando quien propone no está identificado.
 */
export function PurchaseSuggestionForm({
  action,
  showProposer = false,
  defaultName = "",
  defaultEmail = "",
  submitLabel = "suggest.send",
  pendingLabel = "suggest.sending",
}: {
  action: PurchaseSuggestionAction;
  /** Muestra los campos de nombre y correo de quien propone. */
  showProposer?: boolean;
  defaultName?: string;
  defaultEmail?: string;
  submitLabel?: TranslationKey;
  pendingLabel?: TranslationKey;
}) {
  const t = useT();
  const [state, formAction] = useActionState(action, initialActionState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {state.status === "error" && state.message ? (
        <Notice tone="danger">{t(state.message, state.messageParams)}</Notice>
      ) : null}
      {state.status === "success" && state.message ? (
        <Notice tone="success">{t(state.message, state.messageParams)}</Notice>
      ) : null}

      <Field
        label="suggest.bookTitle"
        htmlFor="title"
        error={errors.title}
        required
      >
        <input
          id="title"
          name="title"
          className={inputClass(Boolean(errors.title))}
          maxLength={220}
          required
        />
      </Field>

      <Field
        label="suggest.bookAuthor"
        htmlFor="author"
        error={errors.author}
        required
      >
        <input
          id="author"
          name="author"
          className={inputClass(Boolean(errors.author))}
          maxLength={180}
          required
        />
      </Field>

      <Field label="suggest.isbn" htmlFor="isbn" error={errors.isbn} hint="suggest.optional">
        <input
          id="isbn"
          name="isbn"
          className={inputClass(Boolean(errors.isbn))}
          maxLength={32}
        />
      </Field>

      <Field label="suggest.reason" htmlFor="reason" error={errors.reason} hint="suggest.optional">
        <textarea
          id="reason"
          name="reason"
          className={`${inputClass(Boolean(errors.reason))} min-h-20 resize-y`}
          maxLength={600}
        />
      </Field>

      {showProposer ? (
        <>
          <Field label="suggest.yourName" htmlFor="proposerName" error={errors.proposerName}>
            <input
              id="proposerName"
              name="proposerName"
              defaultValue={defaultName}
              className={inputClass(Boolean(errors.proposerName))}
              maxLength={120}
            />
          </Field>

          <Field
            label="suggest.yourEmail"
            htmlFor="proposerEmail"
            error={errors.proposerEmail}
            hint="suggest.contactHint"
          >
            <input
              id="proposerEmail"
              name="proposerEmail"
              type="email"
              defaultValue={defaultEmail}
              className={inputClass(Boolean(errors.proposerEmail))}
              maxLength={160}
            />
          </Field>
        </>
      ) : null}

      <div className="flex flex-wrap items-center gap-2.5 border-t-2 border-line pt-4">
        <SubmitButton pendingLabel={pendingLabel}>{t(submitLabel)}</SubmitButton>
      </div>
    </form>
  );
}
