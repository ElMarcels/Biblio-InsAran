"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  createCollectionAction,
  updateCollectionAction,
} from "@/lib/actions/collections";
import { initialActionState } from "@/lib/validation";

import { Notice } from "../Notice";
import { SubmitButton } from "../SubmitButton";
import { useT } from "../i18n/LocaleProvider";
import { Field, inputClass } from "./Field";

export type CollectionFormValues = {
  id?: string;
  name: string;
  description: string;
};

export function CollectionForm({
  mode,
  values,
  backHref,
}: {
  mode: "create" | "edit";
  values: CollectionFormValues;
  /** Destino del botón «Cancelar» (en modo creación, la lista). */
  backHref?: string;
}) {
  const t = useT();
  const [state, formAction] = useActionState(
    mode === "create" ? createCollectionAction : updateCollectionAction,
    initialActionState,
  );
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}

      {state.status === "error" && state.message ? (
        <Notice tone="danger">{t(state.message, state.messageParams)}</Notice>
      ) : null}
      {state.status === "success" && state.message ? (
        <Notice tone="success">{t(state.message, state.messageParams)}</Notice>
      ) : null}

      <Field label="forms.collections.nombreDeLaLista" htmlFor="name" error={errors.name} required>
        <input
          id="name"
          name="name"
          defaultValue={values.name}
          className={inputClass(Boolean(errors.name))}
          maxLength={80}
          aria-invalid={Boolean(errors.name)}
          placeholder={t("forms.collections.novedadesClubDeLectura")}
          required
        />
      </Field>

      <Field
        label="forms.collections.descripcion"
        htmlFor="description"
        error={errors.description}
        hint="forms.collections.opcionalApareceBajoElTituloEnLaPaginaPublica"
      >
        <textarea
          id="description"
          name="description"
          defaultValue={values.description}
          className={`${inputClass(Boolean(errors.description))} min-h-20 resize-y`}
          maxLength={300}
        />
      </Field>

      <div className="flex flex-wrap items-center gap-2.5">
        <SubmitButton pendingLabel="forms.collections.guardando">
          {mode === "create" ? t("forms.collections.crearLista") : t("forms.collections.guardarCambios")}
        </SubmitButton>
        <Link href={backHref ?? "/panel/colecciones"} className="btn-ghost">
          {t("forms.collections.cancelar")}
        </Link>
      </div>
    </form>
  );
}
