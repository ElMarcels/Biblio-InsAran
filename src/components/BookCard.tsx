import Link from "next/link";

import { BookCover } from "./BookCover";

export type BookSummary = {
  id: string;
  title: string;
  author: string;
  category: string;
  year: number | null;
  copies: number;
};

export function BookCard({ book }: { book: BookSummary }) {
  return (
    <Link
      href={`/libro/${book.id}`}
      className="group flex flex-col border-2 border-line bg-surface transition-[transform,box-shadow] duration-100 hover:-translate-y-[3px] hover:shadow-[6px_6px_0_0_var(--color-line)]"
    >
      <BookCover
        title={book.title}
        author={book.author}
        category={book.category}
        size="md"
      />
      <div className="flex flex-1 flex-col gap-1 border-t-2 border-line p-3.5">
        <h3 className="font-display text-[15px] font-semibold leading-tight group-hover:text-accent">
          {book.title}
        </h3>
        <p className="text-[13px] text-ink-soft">{book.author}</p>
        <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-2.5">
          <span className="tag-muted">{book.category}</span>
          {book.year ? (
            <span className="text-[12px] tabular-nums text-ink-faint">{book.year}</span>
          ) : null}
          <span className="ml-auto text-[12px] tabular-nums text-ink-faint">
            {book.copies} ej.
          </span>
        </div>
      </div>
    </Link>
  );
}
