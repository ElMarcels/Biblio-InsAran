"use client";

import { useActionState } from "react";

import { createLoanAction } from "@/lib/actions/loans";
import { initialActionState } from "@/lib/validation";

import { Notice } from "../Notice";
import { SubmitButton } from "../SubmitButton";
import { useT } from "../i18n/LocaleProvider";
import { Field, inputClass } from "./Field";

export type BookOption = {
  id: string;
  title: string;
  author: string;
};

export type ReaderOption = {
  id: string;
  fullName: string;
  groupName: string | null;
};

export function LoanForm({
  books,
  readers,
  defaultDueAt,
  defaultBookId = "",
  defaultReaderId = "",
}: {
  books: BookOption[];
  readers: ReaderOption[];
  defaultDueAt: string;
  defaultBookId?: string;
  defaultReaderId?: string;
}) {
  const t = useT();
  const [state, formAction] = useActionState(createLoanAction, initialActionState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {state.status === "error" && state.message ? (
        <Notice tone="danger">{t(state.message)}</Notice>
      ) : null}

      <Field label="Libro" htmlFor="bookId" error={errors.bookId} required>
        <select
          id="bookId"
          name="bookId"
          defaultValue={defaultBookId}
          className={inputClass(Boolean(errors.bookId))}
          required
        >
          <option value="">{t("Selecciona un libro…")}</option>
          {books.map((book) => (
            <option key={book.id} value={book.id}>
              {book.title} — {book.author}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Lector o lectora" htmlFor="readerId" error={errors.readerId} required>
        <select
          id="readerId"
          name="readerId"
          defaultValue={defaultReaderId}
          className={inputClass(Boolean(errors.readerId))}
          required
        >
          <option value="">{t("Selecciona una persona…")}</option>
          {readers.map((reader) => (
            <option key={reader.id} value={reader.id}>
              {reader.fullName}
              {reader.groupName ? ` (${reader.groupName})` : ""}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="Fecha de devolución"
        htmlFor="dueAt"
        error={errors.dueAt}
        hint="Día en que debe volver el ejemplar."
        required
      >
        <input
          id="dueAt"
          name="dueAt"
          type="date"
          defaultValue={defaultDueAt}
          className={inputClass(Boolean(errors.dueAt))}
          required
        />
      </Field>

      <Field label="Notas" htmlFor="notes" error={errors.notes}>
        <textarea
          id="notes"
          name="notes"
          className={`${inputClass(Boolean(errors.notes))} min-h-20 resize-y`}
          maxLength={500}
          placeholder={t("Estado del ejemplar, incidencias…")}
        />
      </Field>

      <div className="flex flex-wrap items-center gap-2.5 border-t-2 border-line pt-4">
        <SubmitButton pendingLabel="Registrando…">{t("Registrar préstamo")}</SubmitButton>
      </div>
    </form>
  );
}
