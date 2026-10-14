"use client";

import Link from "next/link";
import { useActionState } from "react";

import { createBookAction, updateBookAction } from "@/lib/actions/books";
import { CATEGORIES, LANGUAGES } from "@/lib/catalog";
import { initialActionState } from "@/lib/validation";

import { Notice } from "../Notice";
import { SubmitButton } from "../SubmitButton";
import type { BookFormValues } from "./book-form-values";
import { Field, inputClass } from "./Field";

export function BookForm({
  mode,
  values,
}: {
  mode: "create" | "edit";
  values: BookFormValues;
}) {
  const [state, formAction] = useActionState(
    mode === "create" ? createBookAction : updateBookAction,
    initialActionState,
  );
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}

      {state.status === "error" && state.message ? (
        <Notice tone="danger">{state.message}</Notice>
      ) : null}

      <fieldset className="flex flex-col gap-4">
        <legend className="micro mb-1">Datos principales</legend>

        <Field label="Título" htmlFor="title" error={errors.title} required>
          <input
            id="title"
            name="title"
            defaultValue={values.title}
            className={inputClass(Boolean(errors.title))}
            maxLength={220}
            aria-invalid={Boolean(errors.title)}
            required
          />
        </Field>

        <Field label="Autoría" htmlFor="author" error={errors.author} required>
          <input
            id="author"
            name="author"
            defaultValue={values.author}
            className={inputClass(Boolean(errors.author))}
            maxLength={180}
            aria-invalid={Boolean(errors.author)}
            required
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Categoría" htmlFor="category" error={errors.category} required>
            <select
              id="category"
              name="category"
              defaultValue={values.category}
              className={inputClass(Boolean(errors.category))}
            >
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Idioma" htmlFor="language" error={errors.language} required>
            <select
              id="language"
              name="language"
              defaultValue={values.language}
              className={inputClass(Boolean(errors.language))}
            >
              {LANGUAGES.map((language) => (
                <option key={language} value={language}>
                  {language}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4 border-t border-hairline pt-5">
        <legend className="micro mb-1">Edición y ejemplares</legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Editorial" htmlFor="publisher" error={errors.publisher}>
            <input
              id="publisher"
              name="publisher"
              defaultValue={values.publisher}
              className={inputClass(Boolean(errors.publisher))}
              maxLength={160}
            />
          </Field>

          <Field label="Año de publicación" htmlFor="year" error={errors.year}>
            <input
              id="year"
              name="year"
              inputMode="numeric"
              defaultValue={values.year}
              className={inputClass(Boolean(errors.year))}
              placeholder="1988"
            />
          </Field>

          <Field label="ISBN" htmlFor="isbn" error={errors.isbn}>
            <input
              id="isbn"
              name="isbn"
              defaultValue={values.isbn}
              className={inputClass(Boolean(errors.isbn))}
              maxLength={32}
              placeholder="978-84-376-0494-7"
            />
          </Field>

          <Field label="Número de páginas" htmlFor="pages" error={errors.pages}>
            <input
              id="pages"
              name="pages"
              inputMode="numeric"
              defaultValue={values.pages}
              className={inputClass(Boolean(errors.pages))}
            />
          </Field>

          <Field label="Ejemplares" htmlFor="copies" error={errors.copies} required>
            <input
              id="copies"
              name="copies"
              inputMode="numeric"
              type="number"
              min={1}
              max={9999}
              defaultValue={values.copies}
              className={inputClass(Boolean(errors.copies))}
              aria-invalid={Boolean(errors.copies)}
              required
            />
          </Field>

          <Field
            label="Ubicación en la estantería"
            htmlFor="location"
            error={errors.location}
            hint="Por ejemplo: N-01, REF-03…"
          >
            <input
              id="location"
              name="location"
              defaultValue={values.location}
              className={inputClass(Boolean(errors.location))}
              maxLength={60}
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4 border-t border-hairline pt-5">
        <legend className="micro mb-1">Reseña</legend>
        <Field label="Descripción" htmlFor="description" error={errors.description}>
          <textarea
            id="description"
            name="description"
            defaultValue={values.description}
            className={`${inputClass(Boolean(errors.description))} min-h-28 resize-y`}
            maxLength={2000}
          />
        </Field>
      </fieldset>

      <div className="flex flex-wrap items-center gap-2.5 border-t-2 border-line pt-5">
        <SubmitButton pendingLabel="Guardando…">
          {mode === "create" ? "Añadir libro" : "Guardar cambios"}
        </SubmitButton>
        <Link href="/panel/libros" className="btn-ghost">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
