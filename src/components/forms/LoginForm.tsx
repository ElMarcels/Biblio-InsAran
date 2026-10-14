"use client";

import { useActionState } from "react";

import { loginAction } from "@/lib/actions/auth";
import { initialActionState } from "@/lib/validation";

import { Notice } from "../Notice";
import { SubmitButton } from "../SubmitButton";
import { Field, inputClass } from "./Field";

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState(loginAction, initialActionState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}

      {state.status === "error" && state.message ? (
        <Notice tone="danger">{state.message}</Notice>
      ) : null}

      <Field label="Nombre de usuario" htmlFor="username" error={errors.username} required>
        <input
          id="username"
          name="username"
          className={inputClass(Boolean(errors.username))}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          aria-invalid={Boolean(errors.username)}
          required
        />
      </Field>

      <Field label="Contraseña" htmlFor="password" error={errors.password} required>
        <input
          id="password"
          name="password"
          type="password"
          className={inputClass(Boolean(errors.password))}
          autoComplete="current-password"
          aria-invalid={Boolean(errors.password)}
          required
        />
      </Field>

      <SubmitButton className="btn-primary w-full" pendingLabel="Entrando…">
        Entrar
      </SubmitButton>
    </form>
  );
}
