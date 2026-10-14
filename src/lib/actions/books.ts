"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { assertOwner, assertUser, AuthError } from "../auth";
import { recordAudit } from "../audit";
import { findCoverUrl } from "../covers";
import { prisma } from "../prisma";
import {
  bookSchema,
  duplicateMessage,
  fieldErrors,
  type ActionState,
  type DuplicateMatch,
} from "../validation";

const UNAUTHORIZED: ActionState = {
  status: "error",
  message: "Tu sesión ha caducado. Vuelve a iniciar sesión.",
};

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function readBook(formData: FormData) {
  return bookSchema.safeParse({
    title: text(formData, "title"),
    author: text(formData, "author"),
    category: text(formData, "category"),
    isbn: text(formData, "isbn"),
    publisher: text(formData, "publisher"),
    year: text(formData, "year"),
    language: text(formData, "language") || "Español",
    pages: text(formData, "pages"),
    copies: text(formData, "copies"),
    location: text(formData, "location"),
    recordNumber: text(formData, "recordNumber"),
    cdu: text(formData, "cdu"),
    coverUrl: text(formData, "coverUrl"),
    description: text(formData, "description"),
    tags: text(formData, "tags"),
  });
}

/**
 * Decide qué portada guardar: la que ha escrito el personal o, si lo ha
 * pedido, la que encuentra Open Library por ISBN o por título y autoría.
 * Si no hay ninguna, devuelve `null` (portada tipográfica).
 */
async function resolveCover(
  formData: FormData,
  data: { isbn?: string; title: string; author: string; coverUrl?: string },
): Promise<string | null> {
  if (data.coverUrl) return data.coverUrl;
  if (text(formData, "searchCover") !== "1") return null;
  return findCoverUrl({ isbn: data.isbn, title: data.title, author: data.author });
}

/**
 * Busca un libro que probablemente sea el mismo que se está guardando:
 * por ISBN exacto o por título y autoría idénticos (sin distinguir mayúsculas).
 */
async function findDuplicate(input: {
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

/** Revalida las vistas afectadas por un cambio en el catálogo. */
function revalidateCatalog(bookId?: string) {
  revalidatePath("/");
  revalidatePath("/catalogo");
  revalidatePath("/panel");
  revalidatePath("/panel/libros");
  revalidatePath("/panel/colecciones");
  revalidatePath("/colecciones");
  revalidatePath("/autores");
  revalidatePath("/etiquetas");
  if (bookId) revalidatePath(`/libro/${bookId}`);
}

export async function createBookAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let user;
  try {
    user = await assertUser();
  } catch (error) {
    if (error instanceof AuthError) return UNAUTHORIZED;
    throw error;
  }

  const parsed = readBook(formData);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisa los campos marcados antes de guardar.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  // Aviso de duplicado: se pide confirmación antes de crear un libro que
  // probablemente ya está en el catálogo.
  if (text(formData, "confirm") !== "1") {
    const duplicate = await findDuplicate({
      title: parsed.data.title,
      author: parsed.data.author,
      isbn: parsed.data.isbn,
    });
    if (duplicate) {
      return {
        status: "warning",
        message: duplicateMessage(duplicate),
        duplicate,
      };
    }
  }

  const book = await prisma.book.create({
    data: {
      ...parsed.data,
      coverUrl: await resolveCover(formData, parsed.data),
      language: parsed.data.language ?? "Español",
      createdById: user.id,
      updatedById: user.id,
    },
  });

  await recordAudit({
    action: "BOOK_CREATE",
    entityType: "Book",
    entityId: book.id,
    summary: `Añadido «${book.title}» de ${book.author}`,
    userId: user.id,
  });

  revalidateCatalog(book.id);
  redirect("/panel/libros?aviso=creado");
}

export async function updateBookAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let user;
  try {
    user = await assertUser();
  } catch (error) {
    if (error instanceof AuthError) return UNAUTHORIZED;
    throw error;
  }

  const bookId = text(formData, "id");
  if (!bookId) {
    return { status: "error", message: "No se ha indicado qué libro editar." };
  }

  const existing = await prisma.book.findUnique({ where: { id: bookId } });
  if (!existing) {
    return { status: "error", message: "El libro ya no existe." };
  }

  const parsed = readBook(formData);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisa los campos marcados antes de guardar.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  if (text(formData, "confirm") !== "1") {
    const duplicate = await findDuplicate({
      title: parsed.data.title,
      author: parsed.data.author,
      isbn: parsed.data.isbn,
      excludeId: bookId,
    });
    if (duplicate) {
      return {
        status: "warning",
        message: duplicateMessage(duplicate),
        duplicate,
      };
    }
  }

  await prisma.book.update({
    where: { id: bookId },
    data: {
      ...parsed.data,
      coverUrl: await resolveCover(formData, parsed.data),
      language: parsed.data.language ?? "Español",
      updatedById: user.id,
    },
  });

  await recordAudit({
    action: "BOOK_UPDATE",
    entityType: "Book",
    entityId: bookId,
    summary: `Editado «${parsed.data.title}» de ${parsed.data.author}`,
    userId: user.id,
  });

  revalidateCatalog(bookId);
  redirect("/panel/libros?aviso=editado");
}

/** Borrar libros: reservado al dueño de la plataforma. */
export async function deleteBookAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let user;
  try {
    user = await assertOwner();
  } catch (error) {
    if (error instanceof AuthError) {
      return { status: "error", message: "Solo el dueño de la plataforma puede borrar libros." };
    }
    throw error;
  }

  const bookId = text(formData, "id");
  if (!bookId) {
    return { status: "error", message: "No se ha indicado qué libro borrar." };
  }

  const book = await prisma.book.findUnique({ where: { id: bookId } });
  if (!book) {
    return { status: "error", message: "El libro ya no existe." };
  }

  await prisma.book.delete({ where: { id: bookId } });
  await recordAudit({
    action: "BOOK_DELETE",
    entityType: "Book",
    entityId: bookId,
    summary: `Eliminado «${book.title}» de ${book.author}`,
    userId: user.id,
  });

  revalidateCatalog(bookId);
  return { status: "success", message: `Se ha borrado «${book.title}».` };
}
