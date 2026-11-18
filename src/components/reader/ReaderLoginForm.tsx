"use client";

import { useActionState } from "react";

import {
  cancelReaderTwoFactorLoginAction,
  readerLoginAction,
  readerLoginTwoFactorAction,
} from "@/lib/actions/reader-auth";
import { initialActionState } from "@/lib/validation";

import { Notice } from "../Notice";
import { SubmitButton } from "../SubmitButton";
import { useT } from "../i18n/LocaleProvider";
import { Field, inputClass } from "../forms/Field";

/** Acceso al área del lector/a: número de carné y PIN. */
export function ReaderLoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState(readerLoginAction, initialActionState);
  const [twoFactorState, twoFactorAction] = useActionState(
    readerLoginTwoFactorAction,
    initialActionState,
  );
  const errors = state.fieldErrors ?? {};
  const twoFactorErrors = twoFactorState.fieldErrors ?? {};
  const t = useT();

  if (state.twoFactorRequired) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-[14px] text-ink-soft">{t("twoFactor.loginPrompt")}</p>

        <form action={twoFactorAction} className="flex flex-col gap-4" noValidate>
          {next ? <input type="hidden" name="next" value={next} /> : null}

          {twoFactorState.status === "error" && twoFactorState.message ? (
            <Notice tone="danger">
              {t(twoFactorState.message, twoFactorState.messageParams)}
            </Notice>
          ) : null}

          <Field
            label="twoFactor.code"
            htmlFor="code"
            error={twoFactorErrors.code}
            hint="twoFactor.codeHint"
            required
          >
            <input
              id="code"
              name="code"
              className={inputClass(Boolean(twoFactorErrors.code))}
              autoComplete="one-time-code"
              autoCapitalize="characters"
              spellCheck={false}
              aria-invalid={Boolean(twoFactorErrors.code)}
              required
            />
          </Field>

          <SubmitButton
            className="btn-primary w-full"
            pendingLabel="twoFactor.verifying"
          >
            {t("twoFactor.verify")}
          </SubmitButton>
        </form>

        <form action={cancelReaderTwoFactorLoginAction}>
          <button type="submit" className="btn-outline w-full">
            {t("twoFactor.backToLogin")}
          </button>
        </form>
      </div>
    );
  }

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
