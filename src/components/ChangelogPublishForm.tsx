"use client";

import { useActionState, useEffect, useRef } from "react";

import { publishChangelogAction } from "@/lib/actions/changelog";
import { initialActionState } from "@/lib/validation";

import { Notice } from "./Notice";
import { SubmitButton } from "./SubmitButton";
import { useT } from "./i18n/LocaleProvider";
import { Field, inputClass } from "./forms/Field";

/**
 * Publica una novedad de la plataforma en Markdown. La comprueba el servidor
 * (solo dueño o ADMIN): al publicarla desaparece para quien la firma y aparece
 * una sola vez en cada cuenta de personal.
 */
export function ChangelogPublishForm() {
  const t = useT();
  const [state, formAction] = useActionState(
    publishChangelogAction,
    initialActionState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const errors = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state.status]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4" noValidate>
      {state.status === "error" && state.message ? (
        <Notice tone="danger">{t(state.message, state.messageParams)}</Notice>
      ) : null}
      {state.status === "success" && state.message ? (
        <Notice tone="success">{t(state.message, state.messageParams)}</Notice>
      ) : null}

      <Field
        label="panel.changelog.titulo"
        htmlFor="title"
        error={errors.title}
        required
      >
        <input
          id="title"
          name="title"
          className={inputClass(Boolean(errors.title))}
          maxLength={120}
          aria-invalid={Boolean(errors.title)}
          required
        />
      </Field>

      <Field
        label="panel.changelog.contenido"
        htmlFor="body"
        error={errors.body}
        hint="panel.changelog.markdownHint"
        required
      >
        <textarea
          id="body"
          name="body"
          rows={12}
          className={`${inputClass(Boolean(errors.body))} font-mono text-[13px]`}
          maxLength={20000}
          aria-invalid={Boolean(errors.body)}
          required
        />
      </Field>

      <div>
        <SubmitButton pendingLabel="panel.changelog.publicando">
          {t("panel.changelog.publicar")}
        </SubmitButton>
      </div>
    </form>
  );
}
