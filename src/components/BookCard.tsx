"use client";

import Link from "next/link";
import { ViewTransition } from "react";

import { BookCover } from "./BookCover";
import { useT } from "./i18n/LocaleProvider";

export type BookSummary = {
  id: string;
  title: string;
  author: string;
  category: string;
  year: number | null;
  copies: number;
  /** URL de la portada, si se conoce. */
  coverUrl?: string | null;
  /** Ejemplares disponibles ahora mismo (si se conoce). */
  available?: number;
};

export function BookCard({ book }: { book: BookSummary }) {
  const t = useT();
  const available = book.available;
  const allGone = typeof available === "number" && available <= 0;
  return (
    <Link
      href={`/libro/${book.id}`}
      transitionTypes={["nav-forward"]}
      className="group flex flex-col border-2 border-line bg-surface transition-[transform,box-shadow] duration-150 hover:-translate-y-[3px] hover:shadow-[6px_6px_0_0_var(--color-line)]"
    >
      <ViewTransition name={`cover-${book.id}`} share="morph" default="none">
        <BookCover
          title={book.title}
          author={book.author}
          category={book.category}
          src={book.coverUrl}
          size="md"
        />
      </ViewTransition>
      <div className="flex flex-1 flex-col gap-1 border-t-2 border-line p-3.5">
        <h3 className="font-display text-[15px] font-semibold leading-tight transition-colors duration-150 group-hover:text-accent">
          {book.title}
        </h3>
        <p className="text-[13px] text-ink-soft">{book.author}</p>
        <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-2.5">
          <span className="tag-muted">{book.category}</span>
          {book.year ? (
            <span className="text-[12px] tabular-nums text-ink-faint">{book.year}</span>
          ) : null}
          <span className="ml-auto text-[12px] tabular-nums text-ink-faint">
            {typeof available === "number" ? (
              <span className={allGone ? "font-semibold text-danger" : undefined}>
                {allGone
                  ? t("book.sinEjemplares")
                  : t("book.availableDeCopiesDisp", {
                      available,
                      copies: book.copies,
                    })}
              </span>
            ) : (
              t("book.copiesEj", { copies: book.copies })
            )}
          </span>
        </div>
      </div>
    </Link>
  );
}
