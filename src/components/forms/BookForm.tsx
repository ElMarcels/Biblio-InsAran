"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { createBookAction, updateBookAction } from "@/lib/actions/books";
import { CATEGORIES, LANGUAGES } from "@/lib/catalog";
import { initialActionState } from "@/lib/validation";

import { BookCover } from "../BookCover";
import { Notice } from "../Notice";
import { SubmitButton } from "../SubmitButton";
import { useT } from "../i18n/LocaleProvider";
import type { BookFormValues } from "./book-form-values";
import { Field, inputClass } from "./Field";

export function BookForm({
  mode,
  values,
}: {
  mode: "create" | "edit";
  values: BookFormValues;
}) {
  const t = useT();
  const [state, formAction] = useActionState(
    mode === "create" ? createBookAction : updateBookAction,
    initialActionState,
  );
  const [coverUrl, setCoverUrl] = useState(values.coverUrl);
  const errors = state.fieldErrors ?? {};
  const duplicate = state.status === "warning" ? state.duplicate : null;

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}
      {/* Segunda vuelta: el usuario confirma que quiere guardar un duplicado. */}
      {duplicate ? <input type="hidden" name="confirm" value="1" /> : null}

      {state.status === "error" && state.message ? (
        <Notice tone="danger">{t(state.message, state.messageParams)}</Notice>
      ) : null}

      {duplicate ? (
        <Notice tone="warning">
          <span>
            {t(state.message, state.messageParams)}{" "}
            <Link
              href={`/libro/${duplicate.id}`}
              className="font-semibold underline underline-offset-2"
            >
              {t("forms.book.verLaFichaExistente")}
            </Link>
            {t("forms.book.siAunAsiQuieresRegistrarloVuelveAGuardar")}
          </span>
        </Notice>
      ) : null}

      <fieldset className="flex flex-col gap-4">
        <legend className="micro mb-1">{t("forms.book.datosPrincipales")}</legend>

        <Field label="forms.book.titulo" htmlFor="title" error={errors.title} required>
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

        <Field label="forms.book.autoria" htmlFor="author" error={errors.author} required>
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
          <Field label="forms.book.categoria" htmlFor="category" error={errors.category} required>
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

          <Field label="forms.book.idioma" htmlFor="language" error={errors.language} required>
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

        <Field
          label="forms.book.etiquetasMaterias"
          htmlFor="tags"
          error={errors.tags}
          hint="forms.book.separalasConComasPorEjemploNovelaNegraLecturaRecomendadaValDAran"
        >
          <input
            id="tags"
            name="tags"
            defaultValue={values.tags}
            className={inputClass(Boolean(errors.tags))}
            maxLength={1000}
            placeholder={t("forms.book.aventurasClasicos")}
          />
        </Field>
      </fieldset>

      <fieldset className="flex flex-col gap-4 border-t border-hairline pt-5">
        <legend className="micro mb-1">{t("forms.book.edicionYEjemplares")}</legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="forms.book.editorial" htmlFor="publisher" error={errors.publisher}>
            <input
              id="publisher"
              name="publisher"
              defaultValue={values.publisher}
              className={inputClass(Boolean(errors.publisher))}
              maxLength={160}
            />
          </Field>

          <Field label="forms.book.anoDePublicacion" htmlFor="year" error={errors.year}>
            <input
              id="year"
              name="year"
              inputMode="numeric"
              defaultValue={values.year}
              className={inputClass(Boolean(errors.year))}
              placeholder="1988"
            />
          </Field>

          <Field label="forms.book.iSBN" htmlFor="isbn" error={errors.isbn}>
            <input
              id="isbn"
              name="isbn"
              defaultValue={values.isbn}
              className={inputClass(Boolean(errors.isbn))}
              maxLength={32}
              placeholder="978-84-376-0494-7"
            />
          </Field>

          <Field label="forms.book.numeroDePaginas" htmlFor="pages" error={errors.pages}>
            <input
              id="pages"
              name="pages"
              inputMode="numeric"
              defaultValue={values.pages}
              className={inputClass(Boolean(errors.pages))}
            />
          </Field>

          <Field label="forms.book.ejemplares" htmlFor="copies" error={errors.copies} required>
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
            label="forms.book.ubicacionEnLaEstanteria"
            htmlFor="location"
            error={errors.location}
            hint="forms.book.porEjemploN01REF03"
          >
            <input
              id="location"
              name="location"
              defaultValue={values.location}
              className={inputClass(Boolean(errors.location))}
              maxLength={60}
            />
          </Field>

          <Field
            label="forms.book.numeroDeRegistro"
            htmlFor="recordNumber"
            error={errors.recordNumber}
            hint="forms.book.elNumeroDeInventarioSeUsaEnLasCuentasAnuales"
          >
            <input
              id="recordNumber"
              name="recordNumber"
              defaultValue={values.recordNumber}
              className={inputClass(Boolean(errors.recordNumber))}
              maxLength={40}
              placeholder="2026/0143"
            />
          </Field>

          <Field
            label="forms.book.cDU"
            htmlFor="cdu"
            error={errors.cdu}
            hint="forms.book.clasificacionDecimalUniversalPorEjemplo82113423"
          >
            <input
              id="cdu"
              name="cdu"
              defaultValue={values.cdu}
              className={inputClass(Boolean(errors.cdu))}
              maxLength={40}
              placeholder="821.134.2-3"
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4 border-t border-hairline pt-5">
        <legend className="micro mb-1">{t("forms.book.portada")}</legend>

        <div className="flex flex-col gap-5 sm:flex-row">
          <div className="w-[124px] shrink-0">
            <BookCover
              title={values.title}
              author={values.author}
              category={values.category}
              src={coverUrl || null}
              size="sm"
            />
          </div>

          <div className="flex flex-1 flex-col gap-3.5">
            <div>
              <label htmlFor="coverUrl" className="mb-1.5 block text-[13px] font-semibold">
                {t("forms.book.direccionDeLaPortada")}
              </label>
              <input
                id="coverUrl"
                name="coverUrl"
                value={coverUrl}
                onChange={(event) => setCoverUrl(event.target.value)}
                className={inputClass(Boolean(errors.coverUrl))}
                maxLength={500}
                aria-invalid={Boolean(errors.coverUrl)}
                placeholder="https://covers.openlibrary.org/b/id/…"
              />
              {errors.coverUrl ? (
                <p className="mt-1.5 text-[12px] font-semibold text-danger">{t(errors.coverUrl)}</p>
              ) : (
                <p className="mt-1.5 text-[12px] text-ink-faint">
                  {t("forms.book.dejalaVaciaParaUsarLaPortadaTipograficaGeneradaConElTitulo")}
                </p>
              )}
            </div>

            <label className="flex items-start gap-2.5 text-[13px]">
              <input
                type="checkbox"
                name="searchCover"
                value="1"
                defaultChecked={!values.coverUrl}
                className="mt-0.5 h-4 w-4 shrink-0"
              />
              <span>
                <span className="font-semibold">{t("forms.book.buscarLaPortadaAutomaticamente")}</span>
                <span className="block text-[12px] text-ink-faint">
                  {t("forms.book.seBuscaPorISBNOPorTituloYAutoriaAlGuardar")}
                </span>
              </span>
            </label>
          </div>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4 border-t border-hairline pt-5">
        <legend className="micro mb-1">{t("forms.book.resena")}</legend>
        <Field label="forms.book.descripcion" htmlFor="description" error={errors.description}>
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
        <SubmitButton pendingLabel="forms.book.guardando">
          {duplicate
            ? t("forms.book.guardarDeTodasFormas")
            : mode === "create"
              ? t("forms.book.anadirLibro")
              : t("forms.book.guardarCambios")}
        </SubmitButton>
        <Link href="/panel/libros" className="btn-ghost">
          {t("forms.book.cancelar")}
        </Link>
      </div>
    </form>
  );
}
