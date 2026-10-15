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
        <Notice tone="danger">{t(state.message, state.messageParams)}</Notice>
      ) : null}

      <Field label="forms.loans.libro" htmlFor="bookId" error={errors.bookId} required>
        <select
          id="bookId"
          name="bookId"
          defaultValue={defaultBookId}
          className={inputClass(Boolean(errors.bookId))}
          required
        >
          <option value="">{t("forms.loans.seleccionaUnLibro")}</option>
          {books.map((book) => (
            <option key={book.id} value={book.id}>
              {book.title} — {book.author}
            </option>
          ))}
        </select>
      </Field>

      <Field label="forms.loans.lectorOLectora" htmlFor="readerId" error={errors.readerId} required>
        <select
          id="readerId"
          name="readerId"
          defaultValue={defaultReaderId}
          className={inputClass(Boolean(errors.readerId))}
          required
        >
          <option value="">{t("forms.loans.seleccionaUnaPersona")}</option>
          {readers.map((reader) => (
            <option key={reader.id} value={reader.id}>
              {reader.fullName}
              {reader.groupName ? ` (${reader.groupName})` : ""}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="forms.loans.fechaDeDevolucion"
        htmlFor="dueAt"
        error={errors.dueAt}
        hint="forms.loans.diaEnQueDebeVolverElEjemplar"
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

      <Field label="forms.loans.notas" htmlFor="notes" error={errors.notes}>
        <textarea
          id="notes"
          name="notes"
          className={`${inputClass(Boolean(errors.notes))} min-h-20 resize-y`}
          maxLength={500}
          placeholder={t("forms.loans.estadoDelEjemplarIncidencias")}
        />
      </Field>

      <div className="flex flex-wrap items-center gap-2.5 border-t-2 border-line pt-4">
        <SubmitButton pendingLabel="forms.loans.registrando">{t("forms.loans.registrarPrestamo")}</SubmitButton>
      </div>
    </form>
  );
}
