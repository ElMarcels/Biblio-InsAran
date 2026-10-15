"use client";

import { useActionState } from "react";

import { setReaderSuspensionAction } from "@/lib/actions/readers";
import { addDaysInput, initialActionState, todayInput } from "@/lib/validation";

import { Notice } from "../Notice";
import { SubmitButton } from "../SubmitButton";
import { useT } from "../i18n/LocaleProvider";
import { Field, inputClass } from "./Field";

/** Días que proponemos por defecto al suspender el préstamo. */
const DEFAULT_SUSPENSION_DAYS = 15;

/**
 * Formulario para suspender o levantar la suspensión del préstamo a un lector.
 * Dejar la fecha vacía levanta la suspensión vigente.
 */
export function ReaderSuspensionForm({
  readerId,
  suspendedUntil,
  reason,
}: {
  readerId: string;
  /** Fecha actual de fin de suspensión en formato `YYYY-MM-DD`, si la hay. */
  suspendedUntil: string | null;
  reason: string | null;
}) {
  const t = useT();
  const [state, formAction] = useActionState(
    setReaderSuspensionAction,
    initialActionState,
  );
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="readerId" value={readerId} />

      {state.status === "error" && state.message ? (
        <Notice tone="danger">{t(state.message)}</Notice>
      ) : null}
      {state.status === "success" && state.message ? (
        <Notice tone="success">{t(state.message)}</Notice>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Suspendido hasta"
          htmlFor="until"
          error={errors.until}
          hint="Deja la fecha vacía y guarda para levantar la suspensión."
        >
          <input
            id="until"
            name="until"
            type="date"
            defaultValue={
              suspendedUntil ?? addDaysInput(todayInput(), DEFAULT_SUSPENSION_DAYS)
            }
            className={inputClass(Boolean(errors.until))}
          />
        </Field>

        <Field label="Motivo" htmlFor="reason" error={errors.reason}>
          <input
            id="reason"
            name="reason"
            defaultValue={reason ?? ""}
            maxLength={200}
            className={inputClass(Boolean(errors.reason))}
            placeholder={t("Retraso en la devolución…")}
          />
        </Field>
      </div>

      <div>
        <SubmitButton pendingLabel="Guardando…">
          {suspendedUntil ? t("Actualizar suspensión") : t("Suspender préstamo")}
        </SubmitButton>
      </div>
    </form>
  );
}
