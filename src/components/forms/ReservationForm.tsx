"use client";

import { useActionState } from "react";

import { createReservationAction } from "@/lib/actions/loans";
import { initialActionState } from "@/lib/validation";

import { Notice } from "../Notice";
import { SubmitButton } from "../SubmitButton";
import { useT } from "../i18n/LocaleProvider";
import { Field, inputClass } from "./Field";
import type { BookOption, ReaderOption } from "./LoanForm";

export function ReservationForm({
  books,
  readers,
  defaultBookId = "",
}: {
  books: BookOption[];
  readers: ReaderOption[];
  defaultBookId?: string;
}) {
  const t = useT();
  const [state, formAction] = useActionState(
    createReservationAction,
    initialActionState,
  );
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
          defaultValue=""
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

      <Field label="Notas" htmlFor="notes" error={errors.notes}>
        <textarea
          id="notes"
          name="notes"
          className={`${inputClass(Boolean(errors.notes))} min-h-20 resize-y`}
          maxLength={500}
        />
      </Field>

      <div className="flex flex-wrap items-center gap-2.5 border-t-2 border-line pt-4">
        <SubmitButton pendingLabel="Guardando…">{t("Crear reserva")}</SubmitButton>
      </div>
    </form>
  );
}
