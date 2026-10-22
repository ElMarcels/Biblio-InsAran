"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";

import { recordAudit } from "../audit";
import { prisma } from "../prisma";
import { assertReader, ReaderAuthError } from "../reader-auth";
import {
  fieldErrors,
  MAX_READER_LIST_BOOKS,
  MAX_READER_LISTS,
  readerListSchema,
  slugify,
  type ActionState,
} from "../validation";

const UNAUTHORIZED: ActionState = {
  status: "error",
  message: "actions.sessionExpired",
};

const PIN_REQUIRED: ActionState = {
  status: "error",
  message: "actions.readerPinRequired",
};

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

/** Revalida el área de la persona lectora y la ficha del libro. */
function revalidateLists(bookId?: string) {
  revalidatePath("/mi-biblioteca/listas");
  revalidatePath("/mi-biblioteca");
  if (bookId) revalidatePath(`/libro/${bookId}`);
}

/**
 * Identificador de la lista. Las listas de la persona lectora son privadas:
 * el slug solo sirve para identificarlas, por eso lleva un sufijo aleatorio.
 */
function readerListSlug(name: string): string {
  const base = slugify(name) || "lista";
  return `${base}-${crypto.randomBytes(4).toString("hex")}`;
}

/** Comprueba que la lista es de la persona lectora de la sesión. */
async function ownList(readerId: string, collectionId: string) {
  return prisma.collection.findFirst({
    where: { id: collectionId, ownerReaderId: readerId },
  });
}

/**
 * Crea una lista de lectura privada para la persona lectora.
 * Reutiliza el modelo de las listas curadas (`Collection`) marcando quién es
 * la propietaria, de modo que el personal no puede tocar estas listas.
 */
export async function readerCreateListAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let reader;
  try {
    reader = await assertReader();
  } catch (error) {
    if (error instanceof ReaderAuthError) return UNAUTHORIZED;
    throw error;
  }
  if (reader.pinMustChange) return PIN_REQUIRED;

  const parsed = readerListSchema.safeParse({ name: text(formData, "name") });
  if (!parsed.success) {
    return {
      status: "error",
      message: "actions.reviewFieldsBeforeSave",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const count = await prisma.collection.count({
    where: { ownerReaderId: reader.id },
  });
  if (count >= MAX_READER_LISTS) {
    return {
      status: "error",
      message: "actions.readerListLimit",
      messageParams: { max: MAX_READER_LISTS },
    };
  }

  const list = await prisma.collection.create({
    data: {
      name: parsed.data.name,
      slug: readerListSlug(parsed.data.name),
      ownerReaderId: reader.id,
    },
  });

  await recordAudit({
    action: "READER_LIST_CREATE",
    entityType: "Collection",
    entityId: list.id,
    summary: `${reader.fullName} ha creado la lista «${list.name}»`,
  });

  revalidateLists();
  return {
    status: "success",
    message: "actions.readerListCreated",
    messageParams: { name: list.name },
  };
}

/** Borra una lista de la persona lectora (con los libros que tenga dentro). */
export async function readerDeleteListAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let reader;
  try {
    reader = await assertReader();
  } catch (error) {
    if (error instanceof ReaderAuthError) return UNAUTHORIZED;
    throw error;
  }
  if (reader.pinMustChange) return PIN_REQUIRED;

  const id = text(formData, "id");
  if (!id) return { status: "error", message: "actions.readerListNoId" };

  const list = await ownList(reader.id, id);
  if (!list) return { status: "error", message: "actions.readerListGone" };

  await prisma.collection.delete({ where: { id: list.id } });
  await recordAudit({
    action: "READER_LIST_DELETE",
    entityType: "Collection",
    entityId: list.id,
    summary: `${reader.fullName} ha borrado la lista «${list.name}»`,
  });

  revalidateLists();
  return {
    status: "success",
    message: "actions.readerListDeleted",
    messageParams: { name: list.name },
  };
}

/**
 * Añade un libro a una lista de la persona lectora. Si no indica lista, se
 * usa la primera que tenga (o se crea una llamada «Mi lista»).
 */
export async function readerAddBookToListAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let reader;
  try {
    reader = await assertReader();
  } catch (error) {
    if (error instanceof ReaderAuthError) return UNAUTHORIZED;
    throw error;
  }
  if (reader.pinMustChange) return PIN_REQUIRED;

  const bookId = text(formData, "bookId");
  if (!bookId) return { status: "error", message: "actions.readerNoBookId" };

  const book = await prisma.book.findUnique({ where: { id: bookId } });
  if (!book) return { status: "error", message: "actions.bookGone" };

  const requestedId = text(formData, "listId");
  let list = requestedId ? await ownList(reader.id, requestedId) : null;
  if (requestedId && !list) {
    return { status: "error", message: "actions.readerListGone" };
  }

  if (!list) {
    // Sin lista indicada: se reutiliza la primera o se crea «Mi lista».
    list =
      (await prisma.collection.findFirst({
        where: { ownerReaderId: reader.id },
        orderBy: { createdAt: "asc" },
      })) ??
      (await prisma.collection.create({
        data: {
          name: "Mi lista",
          slug: readerListSlug("Mi lista"),
          ownerReaderId: reader.id,
        },
      }));
  }

  const already = await prisma.bookCollection.findUnique({
    where: { bookId_collectionId: { bookId: book.id, collectionId: list.id } },
    select: { bookId: true },
  });
  if (already) {
    return {
      status: "error",
      message: "actions.readerListAlreadyHas",
      messageParams: { title: book.title },
    };
  }

  const items = await prisma.bookCollection.count({
    where: { collectionId: list.id },
  });
  if (items >= MAX_READER_LIST_BOOKS) {
    return {
      status: "error",
      message: "actions.readerListFull",
      messageParams: { max: MAX_READER_LIST_BOOKS },
    };
  }

  const last = await prisma.bookCollection.findFirst({
    where: { collectionId: list.id },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  await prisma.bookCollection.create({
    data: {
      collectionId: list.id,
      bookId: book.id,
      position: (last?.position ?? -1) + 1,
    },
  });

  await recordAudit({
    action: "READER_LIST_ADD_BOOK",
    entityType: "Collection",
    entityId: list.id,
    summary: `${reader.fullName} ha añadido «${book.title}» a su lista «${list.name}»`,
  });

  revalidateLists(book.id);
  return {
    status: "success",
    message: "actions.readerListBookAdded",
    messageParams: { title: book.title },
  };
}

/** Quita un libro de una lista de la persona lectora. */
export async function readerRemoveBookFromListAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let reader;
  try {
    reader = await assertReader();
  } catch (error) {
    if (error instanceof ReaderAuthError) return UNAUTHORIZED;
    throw error;
  }
  if (reader.pinMustChange) return PIN_REQUIRED;

  const listId = text(formData, "listId");
  const bookId = text(formData, "bookId");
  if (!listId || !bookId) {
    return { status: "error", message: "actions.readerListNoId" };
  }

  const list = await ownList(reader.id, listId);
  if (!list) return { status: "error", message: "actions.readerListGone" };

  const item = await prisma.bookCollection.findUnique({
    where: { bookId_collectionId: { bookId, collectionId: listId } },
    include: { book: { select: { title: true } } },
  });
  if (!item) return { status: "error", message: "actions.readerListBookGone" };

  await prisma.bookCollection.delete({
    where: { bookId_collectionId: { bookId, collectionId: listId } },
  });

  await recordAudit({
    action: "READER_LIST_REMOVE_BOOK",
    entityType: "Collection",
    entityId: listId,
    summary: `${reader.fullName} ha quitado «${item.book.title}» de su lista «${list.name}»`,
  });

  revalidateLists(bookId);
  return {
    status: "success",
    message: "actions.readerListBookRemoved",
    messageParams: { title: item.book.title },
  };
}
