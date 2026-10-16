"use client";

import { useActionState, useState } from "react";

import { setReaderSuspensionAction } from "@/lib/actions/readers";
import type { TranslationKey } from "@/lib/i18n/translate";
import { initialActionState, SUSPENSION_UNITS, type SuspensionUnit } from "@/lib/validation";

import { Notice } from "../Notice";
import { SubmitButton } from "../SubmitButton";
import { useT } from "../i18n/LocaleProvider";
import { Field, inputClass } from "./Field";

/** Días que proponemos por defecto al suspender el préstamo. */
const DEFAULT_SUSPENSION_AMOUNT = 15;

const UNIT_KEYS: Record<SuspensionUnit, TranslationKey> = {
  minutos: "forms.readers.unidadMinutos",
  horas: "forms.readers.unidadHoras",
  dias: "forms.readers.unidadDias",
  semanas: "forms.readers.unidadSemanas",
  meses: "forms.readers.unidadMeses",
};

/**
 * Formulario para suspender o levantar la suspensión del préstamo a un lector.
 * La duración la escribe el personal: una cantidad (número) con su unidad
 * (minutos, horas, días, semanas o meses) o la casilla «permanente», que
 * significa que la sanción no caduca.
 */
export function ReaderSuspensionForm({
  readerId,
  suspended,
  reason,
}: {
  readerId: string;
  /** Si la persona ya tiene una suspensión vigente. */
  suspended: boolean;
  /** Motivo de la suspensión vigente (o sugerido), si lo hay. */
  reason: string | null;
}) {
  const t = useT();
  const [state, formAction] = useActionState(
    setReaderSuspensionAction,
    initialActionState,
  );
  const [permanent, setPermanent] = useState(false);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="readerId" value={readerId} />

      {state.status === "error" && state.message ? (
        <Notice tone="danger">{t(state.message, state.messageParams)}</Notice>
      ) : null}
      {state.status === "success" && state.message ? (
        <Notice tone="success">{t(state.message, state.messageParams)}</Notice>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="forms.readers.duracion"
          htmlFor="amount"
          error={errors.amount}
          hint="forms.readers.hintDuracion"
        >
          <div className="flex gap-2">
            <input
              id="amount"
              name="amount"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              defaultValue={DEFAULT_SUSPENSION_AMOUNT}
              disabled={permanent}
              className={`${inputClass(Boolean(errors.amount))} flex-1`}
            />
            <select
              name="unit"
              defaultValue="dias"
              disabled={permanent}
              aria-label={t("forms.readers.unidad")}
              className={`${inputClass(Boolean(errors.unit))} w-auto`}
            >
              {SUSPENSION_UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {t(UNIT_KEYS[unit])}
                </option>
              ))}
            </select>
          </div>
        </Field>

        <Field label="forms.readers.motivo" htmlFor="reason" error={errors.reason}>
          <input
            id="reason"
            name="reason"
            defaultValue={reason ?? ""}
            maxLength={200}
            className={inputClass(Boolean(errors.reason))}
            placeholder={t("forms.readers.retrasoEnLaDevolucion")}
          />
        </Field>
      </div>

      <label className="flex w-fit items-center gap-2 text-[13.5px] font-semibold text-ink">
        <input
          type="checkbox"
          name="permanent"
          value="1"
          checked={permanent}
          onChange={(event) => setPermanent(event.target.checked)}
          className="size-4 accent-[var(--color-accent)]"
        />
        {t("forms.readers.permanente")}
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <SubmitButton pendingLabel="forms.readers.guardando">
          {suspended
            ? t("forms.readers.actualizarSuspension")
            : t("forms.readers.suspenderPrestamo")}
        </SubmitButton>
        {suspended ? (
          <button
            type="submit"
            name="lift"
            value="1"
            className="btn-outline btn-sm"
          >
            {t("forms.readers.levantarSuspension")}
          </button>
        ) : null}
      </div>
    </form>
  );
}
