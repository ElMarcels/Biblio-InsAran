"use client";

import { useActionState, useEffect, useRef } from "react";

import { createUserAction } from "@/lib/actions/users";
import { initialActionState } from "@/lib/validation";

import { Notice } from "../Notice";
import { SubmitButton } from "../SubmitButton";
import { useT } from "../i18n/LocaleProvider";
import { Field, inputClass } from "./Field";

export function CreateUserForm() {
  const t = useT();
  const [state, formAction] = useActionState(createUserAction, initialActionState);
  const formRef = useRef<HTMLFormElement>(null);
  const errors = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state.status]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4" noValidate>
      {state.status === "error" && state.message ? (
        <Notice tone="danger">{t(state.message)}</Notice>
      ) : null}
      {state.status === "success" && state.message ? (
        <Notice tone="success">{t(state.message)}</Notice>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre y apellidos" htmlFor="displayName" error={errors.displayName} required>
          <input
            id="displayName"
            name="displayName"
            className={inputClass(Boolean(errors.displayName))}
            maxLength={120}
            aria-invalid={Boolean(errors.displayName)}
            required
          />
        </Field>

        <Field
          label="Nombre de usuario"
          htmlFor="username"
          error={errors.username}
          hint="Letras, números, punto, guion y guion bajo."
          required
        >
          <input
            id="username"
            name="username"
            className={inputClass(Boolean(errors.username))}
            autoCapitalize="none"
            spellCheck={false}
            maxLength={32}
            aria-invalid={Boolean(errors.username)}
            required
          />
        </Field>
      </div>

      <Field
        label="Contraseña provisional"
        htmlFor="password"
        error={errors.password}
        hint="Mínimo 8 caracteres. La persona deberá cambiarla al entrar."
        required
      >
        <input
          id="password"
          name="password"
          type="password"
          className={inputClass(Boolean(errors.password))}
          autoComplete="new-password"
          aria-invalid={Boolean(errors.password)}
          required
        />
      </Field>

      <div>
        <SubmitButton pendingLabel="Creando…">{t("Crear cuenta")}</SubmitButton>
      </div>
    </form>
  );
}
