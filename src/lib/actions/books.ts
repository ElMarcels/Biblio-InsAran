"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { assertOwner, assertUser, AuthError } from "../auth";
import { recordAudit } from "../audit";
import { prisma } from "../prisma";
import { bookSchema, fieldErrors, type ActionState } from "../validation";

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
    description: text(formData, "description"),
  });
}

/** Revalida las vistas afectadas por un cambio en el catálogo. */
function revalidateCatalog(bookId?: string) {
  revalidatePath("/");
  revalidatePath("/catalogo");
  revalidatePath("/panel");
  revalidatePath("/panel/libros");
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

  const book = await prisma.book.create({
    data: {
      ...parsed.data,
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

  await prisma.book.update({
    where: { id: bookId },
    data: {
      ...parsed.data,
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
