"use client";

import { useActionState } from "react";

import { changeOwnPasswordAction } from "@/lib/actions/auth";
import { initialActionState } from "@/lib/validation";

import { Notice } from "../Notice";
import { SubmitButton } from "../SubmitButton";
import { Field, inputClass } from "./Field";

export function ChangePasswordForm() {
  const [state, formAction] = useActionState(changeOwnPasswordAction, initialActionState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {state.status === "error" && state.message ? (
        <Notice tone="danger">{state.message}</Notice>
      ) : null}
      {state.status === "success" && state.message ? (
        <Notice tone="success">{state.message}</Notice>
      ) : null}

      <Field
        label="Contraseña actual"
        htmlFor="currentPassword"
        error={errors.currentPassword}
        required
      >
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          className={inputClass(Boolean(errors.currentPassword))}
          autoComplete="current-password"
          aria-invalid={Boolean(errors.currentPassword)}
          required
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Nueva contraseña"
          htmlFor="newPassword"
          error={errors.newPassword}
          hint="Mínimo 8 caracteres."
          required
        >
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            className={inputClass(Boolean(errors.newPassword))}
            autoComplete="new-password"
            aria-invalid={Boolean(errors.newPassword)}
            required
          />
        </Field>

        <Field
          label="Repite la nueva contraseña"
          htmlFor="confirmPassword"
          error={errors.confirmPassword}
          required
        >
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            className={inputClass(Boolean(errors.confirmPassword))}
            autoComplete="new-password"
            aria-invalid={Boolean(errors.confirmPassword)}
            required
          />
        </Field>
      </div>

      <div>
        <SubmitButton pendingLabel="Actualizando…">Actualizar contraseña</SubmitButton>
      </div>
    </form>
  );
}
