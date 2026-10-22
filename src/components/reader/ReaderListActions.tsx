"use client";

import { useActionState, useState } from "react";

import {
  readerAddBookToListAction,
  readerCreateListAction,
  readerDeleteListAction,
  readerRemoveBookFromListAction,
} from "@/lib/actions/reader-lists";
import { initialActionState } from "@/lib/validation";

import { Notice } from "../Notice";
import { useT } from "../i18n/LocaleProvider";
import { Field, inputClass } from "../forms/Field";

/** Lista de lectura de la persona lectora (nombre e identificador). */
export type ReaderListOption = { id: string; name: string };

/**
 * Botón «Quiero leer» de la ficha de un libro: deja elegir en qué lista
 * guardarlo. Si la persona todavía no tiene ninguna, se crea «Mi lista».
 */
export function AddToListButton({
  bookId,
  lists,
}: {
  bookId: string;
  lists: ReaderListOption[];
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    readerAddBookToListAction,
    initialActionState,
  );

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="btn-outline btn-sm"
      >
        {t("reader.addToList")}
      </button>

      {open ? (
        <form
          action={formAction}
          className="flex w-64 flex-col gap-2.5 border-2 border-line bg-surface p-3"
        >
          <input type="hidden" name="bookId" value={bookId} />

          <Field label="reader.chooseList" htmlFor={`list-${bookId}`}>
            <select
              id={`list-${bookId}`}
              name="listId"
              className={inputClass()}
              defaultValue={lists[0]?.id ?? ""}
            >
              {lists.length === 0 ? (
                <option value="">{t("reader.myLists")}</option>
              ) : (
                lists.map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.name}
                  </option>
                ))
              )}
            </select>
          </Field>

          {state.status === "error" && state.message ? (
            <Notice tone="danger">{t(state.message, state.messageParams)}</Notice>
          ) : null}
          {state.status === "success" && state.message ? (
            <Notice tone="success">{t(state.message, state.messageParams)}</Notice>
          ) : null}

          <button type="submit" disabled={pending} className="btn-primary btn-sm">
            {pending ? "…" : t("reader.add")}
          </button>
        </form>
      ) : null}
    </div>
  );
}

/** Quita un libro de una lista de la persona lectora. */
export function RemoveFromListButton({
  listId,
  bookId,
  compact = false,
}: {
  listId: string;
  bookId: string;
  /** Versión mínima, para las etiquetas de la ficha del libro. */
  compact?: boolean;
}) {
  const t = useT();
  const [state, formAction, pending] = useActionState(
    readerRemoveBookFromListAction,
    initialActionState,
  );

  return (
    <form action={formAction} className="inline-flex flex-col items-end gap-1">
      <input type="hidden" name="listId" value={listId} />
      <input type="hidden" name="bookId" value={bookId} />
      <button
        type="submit"
        disabled={pending}
        aria-label={t("reader.removeFromList")}
        className={
          compact
            ? "px-1 text-[14px] leading-none text-ink-faint hover:text-danger"
            : "btn-ghost btn-sm"
        }
      >
        {pending ? "…" : compact ? "×" : t("reader.removeFromList")}
      </button>
      {state.status === "error" && state.message ? (
        <span className="error-text">{t(state.message, state.messageParams)}</span>
      ) : null}
    </form>
  );
}

/** Borra una lista completa de la persona lectora. */
export function DeleteReaderListButton({ listId }: { listId: string }) {
  const t = useT();
  const [state, formAction, pending] = useActionState(
    readerDeleteListAction,
    initialActionState,
  );

  if (state.status === "success") {
    return (
      <span className="text-[12px] font-semibold text-ink-faint">
        {t("actions.readerListDeleted")}
      </span>
    );
  }

  return (
    <form action={formAction} className="inline-flex flex-col items-end gap-1">
      <input type="hidden" name="id" value={listId} />
      <button type="submit" disabled={pending} className="btn-ghost btn-sm text-danger">
        {pending ? "…" : t("reader.deleteList")}
      </button>
      {state.status === "error" && state.message ? (
        <span className="error-text">{t(state.message, state.messageParams)}</span>
      ) : null}
    </form>
  );
}

/** Formulario para crear una lista de lectura nueva. */
export function CreateReaderListForm() {
  const t = useT();
  const [state, formAction, pending] = useActionState(
    readerCreateListAction,
    initialActionState,
  );
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-3" noValidate>
      {state.status === "error" && state.message ? (
        <Notice tone="danger">{t(state.message, state.messageParams)}</Notice>
      ) : null}
      {state.status === "success" && state.message ? (
        <Notice tone="success">{t(state.message, state.messageParams)}</Notice>
      ) : null}

      <Field label="reader.listName" htmlFor="name" error={errors.name} required>
        <input
          id="name"
          name="name"
          className={inputClass(Boolean(errors.name))}
          maxLength={60}
          required
        />
      </Field>

      <div>
        <button type="submit" disabled={pending} className="btn-primary btn-sm">
          {pending ? "…" : t("reader.createList")}
        </button>
      </div>
    </form>
  );
}
