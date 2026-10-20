"use client";

import { useActionState } from "react";

import { changeOwnReaderPinAction } from "@/lib/actions/reader-auth";
import { initialActionState } from "@/lib/validation";

import { Notice } from "../Notice";
import { SubmitButton } from "../SubmitButton";
import { useT } from "../i18n/LocaleProvider";
import { Field, inputClass } from "../forms/Field";

/**
 * Cambio del PIN de «Mi biblioteca».
 *
 * `forced` es el primer acceso: no se pide el PIN actual (la sesión acaba de
 * validar el inicial) y el formulario solo pide elegir el nuevo.
 */
export function ChangePinForm({ forced }: { forced?: boolean }) {
  const [state, formAction] = useActionState(
    changeOwnReaderPinAction,
    initialActionState,
  );
  const errors = state.fieldErrors ?? {};
  const t = useT();

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {forced ? <input type="hidden" name="forced" value="1" /> : null}

      {state.status === "error" && state.message ? (
        <Notice tone="danger">{t(state.message, state.messageParams)}</Notice>
      ) : null}

      {!forced ? (
        <Field
          label="reader.currentPin"
          htmlFor="currentPin"
          error={errors.currentPin}
          required
        >
          <input
            id="currentPin"
            name="currentPin"
            type="password"
            inputMode="numeric"
            maxLength={6}
            className={inputClass(Boolean(errors.currentPin))}
            autoComplete="current-password"
            aria-invalid={Boolean(errors.currentPin)}
            required
          />
        </Field>
      ) : null}

      <Field
        label="reader.newPin"
        htmlFor="newPin"
        error={errors.newPin}
        hint="reader.pinHint"
        required
      >
        <input
          id="newPin"
          name="newPin"
          type="password"
          inputMode="numeric"
          maxLength={6}
          className={inputClass(Boolean(errors.newPin))}
          autoComplete="new-password"
          aria-invalid={Boolean(errors.newPin)}
          required
        />
      </Field>

      <Field
        label="reader.confirmPin"
        htmlFor="confirmPin"
        error={errors.confirmPin}
        required
      >
        <input
          id="confirmPin"
          name="confirmPin"
          type="password"
          inputMode="numeric"
          maxLength={6}
          className={inputClass(Boolean(errors.confirmPin))}
          autoComplete="new-password"
          aria-invalid={Boolean(errors.confirmPin)}
          required
        />
      </Field>

      <SubmitButton className="btn-primary w-fit" pendingLabel="common.saving">
        {t(forced ? "reader.setPin" : "reader.changePin")}
      </SubmitButton>
    </form>
  );
}
