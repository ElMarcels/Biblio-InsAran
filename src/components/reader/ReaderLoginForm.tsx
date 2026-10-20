"use client";

import { useActionState } from "react";

import { readerLoginAction } from "@/lib/actions/reader-auth";
import { initialActionState } from "@/lib/validation";

import { Notice } from "../Notice";
import { SubmitButton } from "../SubmitButton";
import { useT } from "../i18n/LocaleProvider";
import { Field, inputClass } from "../forms/Field";

/** Acceso al área del lector/a: número de carné y PIN. */
export function ReaderLoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState(readerLoginAction, initialActionState);
  const errors = state.fieldErrors ?? {};
  const t = useT();

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}

      {state.status === "error" && state.message ? (
        <Notice tone="danger">{t(state.message, state.messageParams)}</Notice>
      ) : null}

      <Field
        label="reader.cardNumber"
        htmlFor="cardNumber"
        error={errors.cardNumber}
        required
      >
        <input
          id="cardNumber"
          name="cardNumber"
          className={inputClass(Boolean(errors.cardNumber))}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="INSARAN-0001"
          aria-invalid={Boolean(errors.cardNumber)}
          required
        />
      </Field>

      <Field label="reader.pin" htmlFor="pin" error={errors.pin} required>
        <input
          id="pin"
          name="pin"
          type="password"
          inputMode="numeric"
          maxLength={6}
          className={inputClass(Boolean(errors.pin))}
          autoComplete="current-password"
          aria-invalid={Boolean(errors.pin)}
          required
        />
      </Field>

      <SubmitButton className="btn-primary w-full" pendingLabel="reader.entering">
        {t("reader.enter")}
      </SubmitButton>
    </form>
  );
}
