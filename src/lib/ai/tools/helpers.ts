import "server-only";

import type { Book } from "@prisma/client";

import { prisma } from "../../prisma";
import type { AssistantBook } from "../types";

/** Cuenta ejemplares prestados y reservas activas para una lista de libros. */
export async function availabilityFor(
  bookIds: string[],
): Promise<{ onLoan: Map<string, number>; reserved: Map<string, number> }> {
  const onLoan = new Map<string, number>();
  const reserved = new Map<string, number>();
  if (bookIds.length === 0) return { onLoan, reserved };

  const [loans, reservations] = await Promise.all([
    prisma.loan.groupBy({
      by: ["bookId"],
      where: { bookId: { in: bookIds }, returnedAt: null },
      _count: { _all: true },
    }),
    prisma.reservation.groupBy({
      by: ["bookId"],
      where: { bookId: { in: bookIds }, status: "ACTIVE" },
      _count: { _all: true },
    }),
  ]);

  for (const row of loans) onLoan.set(row.bookId, row._count._all);
  for (const row of reservations) reserved.set(row.bookId, row._count._all);
  return { onLoan, reserved };
}

/** Convierte un libro en la tarjeta que consume la interfaz. */
export function toAssistantBook(
  book: Book,
  onLoan = 0,
): AssistantBook {
  return {
    id: book.id,
    title: book.title,
    author: book.author,
    category: book.category,
    year: book.year,
    copies: book.copies,
    available: Math.max(0, book.copies - onLoan),
    coverUrl: book.coverUrl,
  };
}

export async function toAssistantBooks(books: Book[]): Promise<AssistantBook[]> {
  const { onLoan } = await availabilityFor(books.map((book) => book.id));
  return books.map((book) => toAssistantBook(book, onLoan.get(book.id) ?? 0));
}

/** Recorta un texto para que no infle el prompt ni la base de datos. */
export function clip(value: string | null | undefined, max = 600): string | null {
  if (!value) return null;
  const clean = value.trim();
  if (!clean) return null;
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

/** Datos de un libro aptos para el modelo (sin datos internos innecesarios). */
export function bookForModel(book: Book, available: number, reserved = 0) {
  return {
    id: book.id,
    title: book.title,
    author: book.author,
    category: book.category,
    language: book.language,
    year: book.year,
    publisher: book.publisher,
    isbn: book.isbn,
    pages: book.pages,
    copies: book.copies,
    available,
    reserved,
    location: book.location,
    cdu: book.cdu,
    tags: book.tags,
    description: clip(book.description, 900),
  };
}

export function bookLabel(book: { title: string; author: string }): string {
  return `«${book.title}» de ${book.author}`;
}

export function isoDate(value: Date | null | undefined): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

/** Normaliza una consulta de búsqueda. */
export function cleanQuery(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, 120) : "";
}
