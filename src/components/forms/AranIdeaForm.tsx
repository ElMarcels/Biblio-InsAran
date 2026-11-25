"use client";

import { useActionState, useEffect, useRef } from "react";

import { createAranIdeaAction } from "@/lib/actions/aran";
import { initialActionState } from "@/lib/validation";

import { Notice } from "../Notice";
import { SubmitButton } from "../SubmitButton";
import { useT } from "../i18n/LocaleProvider";
import { Field, inputClass } from "./Field";

export function AranIdeaForm() {
  const t = useT();
  const [state, formAction] = useActionState(createAranIdeaAction, initialActionState);
  const formRef = useRef<HTMLFormElement>(null);
  const errors = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4" noValidate>
      {state.status === "error" && state.message ? (
        <Notice tone="danger">{t(state.message, state.messageParams)}</Notice>
      ) : null}
      {state.status === "success" && state.message ? (
        <Notice tone="success">{t(state.message, state.messageParams)}</Notice>
      ) : null}

      <Field label="panel.aran.ideaTitleLabel" htmlFor="title" error={errors.title} required>
        <input
          id="title"
          name="title"
          className={inputClass(Boolean(errors.title))}
          maxLength={140}
          aria-invalid={Boolean(errors.title)}
          required
        />
      </Field>

      <Field
        label="panel.aran.ideaDescriptionLabel"
        htmlFor="description"
        error={errors.description}
        required
      >
        <textarea
          id="description"
          name="description"
          rows={6}
          className={inputClass(Boolean(errors.description))}
          maxLength={3000}
          aria-invalid={Boolean(errors.description)}
          required
        />
      </Field>

      <div>
        <SubmitButton pendingLabel="panel.aran.sending">
          {t("panel.aran.submitIdea")}
        </SubmitButton>
      </div>
    </form>
  );
}