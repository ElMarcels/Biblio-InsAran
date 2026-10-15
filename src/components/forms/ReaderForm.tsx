"use client";

import Link from "next/link";
import { useActionState } from "react";

import { createReaderAction, updateReaderAction } from "@/lib/actions/readers";
import { initialActionState } from "@/lib/validation";

import { Notice } from "../Notice";
import { SubmitButton } from "../SubmitButton";
import { useT } from "../i18n/LocaleProvider";
import { Field, inputClass } from "./Field";

export type ReaderFormValues = {
  id?: string;
  fullName: string;
  cardNumber: string;
  groupName: string;
  email: string;
  phone: string;
  notes: string;
};

export const EMPTY_READER: ReaderFormValues = {
  fullName: "",
  cardNumber: "",
  groupName: "",
  email: "",
  phone: "",
  notes: "",
};

export function ReaderForm({
  mode,
  values,
  compact = false,
}: {
  mode: "create" | "edit";
  values: ReaderFormValues;
  compact?: boolean;
}) {
  const t = useT();
  const [state, formAction] = useActionState(
    mode === "create" ? createReaderAction : updateReaderAction,
    initialActionState,
  );
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}

      {state.status === "error" && state.message ? (
        <Notice tone="danger">{t(state.message, state.messageParams)}</Notice>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="forms.readers.nombreYApellidos" htmlFor="fullName" error={errors.fullName} required>
          <input
            id="fullName"
            name="fullName"
            defaultValue={values.fullName}
            className={inputClass(Boolean(errors.fullName))}
            maxLength={120}
            required
          />
        </Field>

        <Field label="forms.readers.numeroDeCarne" htmlFor="cardNumber" error={errors.cardNumber}>
          <input
            id="cardNumber"
            name="cardNumber"
            defaultValue={values.cardNumber}
            className={inputClass(Boolean(errors.cardNumber))}
            maxLength={32}
            placeholder={t("forms.readers.opcional")}
          />
        </Field>

        <Field label="forms.readers.cursoOGrupo" htmlFor="groupName" error={errors.groupName}>
          <input
            id="groupName"
            name="groupName"
            defaultValue={values.groupName}
            className={inputClass(Boolean(errors.groupName))}
            maxLength={60}
            placeholder="2n ESO A"
          />
        </Field>

        <Field label="forms.readers.correoElectronico" htmlFor="email" error={errors.email}>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={values.email}
            className={inputClass(Boolean(errors.email))}
            maxLength={160}
          />
        </Field>

        <Field label="forms.readers.telefono" htmlFor="phone" error={errors.phone}>
          <input
            id="phone"
            name="phone"
            defaultValue={values.phone}
            className={inputClass(Boolean(errors.phone))}
            maxLength={30}
          />
        </Field>
      </div>

      <Field label="forms.readers.notas" htmlFor="notes" error={errors.notes}>
        <textarea
          id="notes"
          name="notes"
          defaultValue={values.notes}
          className={`${inputClass(Boolean(errors.notes))} min-h-20 resize-y`}
          maxLength={500}
        />
      </Field>

      <div className={`flex flex-wrap items-center gap-2.5 ${compact ? "" : "border-t-2 border-line pt-4"}`}>
        <SubmitButton pendingLabel="forms.readers.guardando">
          {mode === "create" ? t("forms.readers.darDeAlta") : t("forms.readers.guardarCambios")}
        </SubmitButton>
        {mode === "edit" ? (
          <Link href="/panel/lectores" className="btn-ghost">
            {t("forms.readers.volverAlListado")}
          </Link>
        ) : null}
      </div>
    </form>
  );
}
