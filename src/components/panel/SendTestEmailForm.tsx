"use client";

import { useActionState } from "react";

import { sendTestEmailAction } from "@/lib/actions/mail";
import { initialActionState } from "@/lib/validation";

import { Notice } from "../Notice";
import { SubmitButton } from "../SubmitButton";
import { useT } from "../i18n/LocaleProvider";
import { Field, inputClass } from "../forms/Field";

export function SendTestEmailForm({ defaultEmail = "" }: { defaultEmail?: string }) {
  const t = useT();
  const [state, formAction] = useActionState(sendTestEmailAction, initialActionState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {state.status === "error" && state.message ? (
        <Notice tone="danger">{t(state.message, state.messageParams)}</Notice>
      ) : null}
      {state.status === "success" && state.message ? (
        <Notice tone="success">{t(state.message, state.messageParams)}</Notice>
      ) : null}

      <Field label="panel.mail.to" htmlFor="to" error={errors.to} required>
        <input
          id="to"
          name="to"
          type="email"
          defaultValue={defaultEmail}
          className={inputClass(Boolean(errors.to))}
          placeholder="correo@ejemplo.com"
          required
        />
      </Field>

      <div className="flex flex-wrap items-center gap-2.5 border-t-2 border-line pt-4">
        <SubmitButton pendingLabel="panel.mail.sending">{t("panel.mail.send")}</SubmitButton>
      </div>
    </form>
  );
}
