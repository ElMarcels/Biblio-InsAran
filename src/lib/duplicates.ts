import type { Prisma } from "@prisma/client";

import { prisma } from "./prisma";
import type { DuplicateMatch } from "./validation";

/**
 * Busca un libro que probablemente sea el mismo que se está guardando:
 * por ISBN exacto o por título y autoría idénticos (sin distinguir mayúsculas).
 *
 * Lo usan el alta de libros del panel y la aprobación de solicitudes de
 * compra: así un título que ya está en el catálogo no se duplica.
 */
export async function findDuplicate(input: {
  title: string;
  author: string;
  isbn?: string;
  excludeId?: string;
}): Promise<DuplicateMatch | null> {
  const or: Prisma.BookWhereInput[] = [];
  if (input.isbn) {
    or.push({ isbn: { equals: input.isbn, mode: "insensitive" } });
  }
  or.push({
    AND: [
      { title: { equals: input.title, mode: "insensitive" } },
      { author: { equals: input.author, mode: "insensitive" } },
    ],
  });

  const where: Prisma.BookWhereInput = { OR: or };
  if (input.excludeId) where.id = { not: input.excludeId };

  const match = await prisma.book.findFirst({
    where,
    select: { id: true, title: true, author: true, isbn: true },
  });
  if (!match) return null;

  const sameIsbn =
    Boolean(input.isbn) &&
    Boolean(match.isbn) &&
    match.isbn!.toLowerCase() === input.isbn!.toLowerCase();

  return {
    id: match.id,
    title: match.title,
    author: match.author,
    reason: sameIsbn ? "isbn" : "title",
  };
}
