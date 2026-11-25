"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  createDigitalResourceAction,
  updateDigitalResourceAction,
} from "@/lib/actions/digital-resources";
import {
  DIGITAL_RESOURCE_TYPES,
  initialActionState,
  type DigitalResourceType,
} from "@/lib/validation";
import type { TranslationKey } from "@/lib/i18n/translate";

import { Notice } from "../Notice";
import { SubmitButton } from "../SubmitButton";
import { useT } from "../i18n/LocaleProvider";
import { Field, inputClass } from "./Field";

export type DigitalResourceFormValues = {
  id?: string;
  title: string;
  author: string;
  type: DigitalResourceType;
  url: string;
  description: string;
  language: string;
};

const TYPE_LABELS: Record<DigitalResourceType, TranslationKey> = {
  AUDIOBOOK: "digitalResources.type.AUDIOBOOK",
  PDF: "digitalResources.type.PDF",
  EBOOK: "digitalResources.type.EBOOK",
  LINK: "digitalResources.type.LINK",
};

export function DigitalResourceForm({
  mode,
  values,
  backHref = "/panel/recursos-digitales",
}: {
  mode: "create" | "edit";
  values: DigitalResourceFormValues;
  backHref?: string;
}) {
  const t = useT();
  const [state, formAction] = useActionState(
    mode === "create" ? createDigitalResourceAction : updateDigitalResourceAction,
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

      <Field
        label="forms.digitalResources.title"
        htmlFor="title"
        error={errors.title}
        required
      >
        <input
          id="title"
          name="title"
          defaultValue={values.title}
          className={inputClass(Boolean(errors.title))}
          maxLength={180}
          aria-invalid={Boolean(errors.title)}
          required
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="forms.digitalResources.author" htmlFor="author" error={errors.author}>
          <input
            id="author"
            name="author"
            defaultValue={values.author}
            className={inputClass(Boolean(errors.author))}
            maxLength={160}
            aria-invalid={Boolean(errors.author)}
          />
        </Field>

        <Field
          label="forms.digitalResources.type"
          htmlFor="type"
          error={errors.type}
          required
        >
          <select
            id="type"
            name="type"
            defaultValue={values.type}
            className={inputClass(Boolean(errors.type))}
            aria-invalid={Boolean(errors.type)}
            required
          >
            {DIGITAL_RESOURCE_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(TYPE_LABELS[type])}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field
        label="forms.digitalResources.url"
        htmlFor="url"
        error={errors.url}
        hint="forms.digitalResources.urlHint"
        required
      >
        <input
          id="url"
          name="url"
          type="url"
          inputMode="url"
          defaultValue={values.url}
          className={inputClass(Boolean(errors.url))}
          maxLength={2000}
          aria-invalid={Boolean(errors.url)}
          autoComplete="url"
          required
        />
      </Field>

      <Field label="forms.digitalResources.description" htmlFor="description" error={errors.description}>
        <textarea
          id="description"
          name="description"
          defaultValue={values.description}
          className={`${inputClass(Boolean(errors.description))} min-h-24 resize-y`}
          maxLength={1200}
          aria-invalid={Boolean(errors.description)}
        />
      </Field>

      <Field label="forms.digitalResources.language" htmlFor="language" error={errors.language}>
        <input
          id="language"
          name="language"
          defaultValue={values.language}
          className={inputClass(Boolean(errors.language))}
          maxLength={40}
          aria-invalid={Boolean(errors.language)}
          placeholder={t("forms.digitalResources.languagePlaceholder")}
        />
      </Field>

      <div className="flex flex-wrap items-center gap-2.5">
        <SubmitButton pendingLabel="forms.digitalResources.saving">
          {mode === "create"
            ? t("forms.digitalResources.add")
            : t("forms.digitalResources.save")}
        </SubmitButton>
        <Link href={backHref} className="btn-ghost">
          {t("forms.digitalResources.cancel")}
        </Link>
      </div>
    </form>
  );
}