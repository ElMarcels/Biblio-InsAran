"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { assertManager, assertUser, AuthError } from "../auth";
import { recordAudit } from "../audit";
import { prisma } from "../prisma";
import {
  collectionSchema,
  fieldErrors,
  slugify,
  type ActionState,
} from "../validation";

const UNAUTHORIZED: ActionState = {
  status: "error",
  message: "actions.sessionExpired",
};

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

/** Revalida las vistas que muestran listas curadas. */
function revalidateCollections(collectionId?: string) {
  revalidatePath("/");
  revalidatePath("/colecciones");
  revalidatePath("/panel");
  revalidatePath("/panel/colecciones");
  if (collectionId) {
    revalidatePath(`/panel/colecciones/${collectionId}`);
    revalidatePath(`/panel/colecciones/${collectionId}`, "layout");
  }
}

/**
 * Genera un slug único para la URL pública a partir del nombre: así
 * "Club de lectura" queda en `/colecciones/club-de-lectura`.
 */
async function uniqueSlug(name: string, excludeId?: string): Promise<string> {
  const base = slugify(name) || "lista";
  let candidate = base;
  let suffix = 2;
  for (;;) {
    const existing = await prisma.collection.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing || existing.id === excludeId) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

function readCollection(formData: FormData) {
  return collectionSchema.safeParse({
    name: text(formData, "name"),
    description: text(formData, "description"),
  });
}

/**
 * Busca una lista curada gestionable por el personal. Las listas privadas de
 * las personas lectoras (`ownerReaderId`) quedan fuera: son suyas.
 */
function staffCollection(collectionId: string) {
  return prisma.collection.findFirst({
    where: { id: collectionId, ownerReaderId: null },
  });
}

export async function createCollectionAction(
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

  const parsed = readCollection(formData);
  if (!parsed.success) {
    return {
      status: "error",
      message: "actions.reviewFieldsBeforeSave",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const collection = await prisma.collection.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      slug: await uniqueSlug(parsed.data.name),
      createdById: user.id,
    },
  });

  await recordAudit({
    action: "COLLECTION_CREATE",
    entityType: "Collection",
    entityId: collection.id,
    summary: `Creada la lista «${collection.name}»`,
    userId: user.id,
  });

  revalidateCollections(collection.id);
  redirect(`/panel/colecciones/${collection.id}`);
}

export async function updateCollectionAction(
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

  const collectionId = text(formData, "id");
  if (!collectionId) {
    return { status: "error", message: "actions.collectionNoIdEdit" };
  }

  const existing = await staffCollection(collectionId);
  if (!existing) {
    return { status: "error", message: "actions.collectionGone" };
  }

  const parsed = readCollection(formData);
  if (!parsed.success) {
    return {
      status: "error",
      message: "actions.reviewFieldsBeforeSave",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  await prisma.collection.update({
    where: { id: collectionId },
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      slug:
        parsed.data.name === existing.name
          ? existing.slug
          : await uniqueSlug(parsed.data.name, collectionId),
    },
  });

  await recordAudit({
    action: "COLLECTION_UPDATE",
    entityType: "Collection",
    entityId: collectionId,
    summary: `Editada la lista «${parsed.data.name}»`,
    userId: user.id,
  });

  revalidateCollections(collectionId);
  return {
    status: "success",
    message: "actions.collectionSaved",
    messageParams: { name: parsed.data.name },
  };
}

/** Borrar listas: reservado a la administración, como los libros. */
export async function deleteCollectionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let user;
  try {
    user = await assertManager();
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        status: "error",
        message: "actions.collectionOwnerOnly",
      };
    }
    throw error;
  }

  const collectionId = text(formData, "id");
  if (!collectionId) {
    return { status: "error", message: "actions.collectionNoIdDelete" };
  }

  const collection = await staffCollection(collectionId);
  if (!collection) {
    return { status: "error", message: "actions.collectionGone" };
  }

  await prisma.collection.delete({ where: { id: collectionId } });
  await recordAudit({
    action: "COLLECTION_DELETE",
    entityType: "Collection",
    entityId: collectionId,
    summary: `Eliminada la lista «${collection.name}»`,
    userId: user.id,
  });

  revalidateCollections();
  redirect("/panel/colecciones?aviso=borrada");
}

/** Añade un libro al final de la lista. */
export async function addBookToCollectionAction(formData: FormData): Promise<void> {
  await assertUser();

  const collectionId = text(formData, "collectionId");
  const bookId = text(formData, "bookId");
  if (!collectionId || !bookId) return;

  if (!(await staffCollection(collectionId))) return;

  const last = await prisma.bookCollection.findFirst({
    where: { collectionId },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  await prisma.bookCollection.upsert({
    where: { bookId_collectionId: { collectionId, bookId } },
    create: { collectionId, bookId, position: (last?.position ?? -1) + 1 },
    update: {},
  });

  revalidateCollections(collectionId);
}

/** Quita un libro de la lista. */
export async function removeBookFromCollectionAction(formData: FormData): Promise<void> {
  await assertUser();

  const collectionId = text(formData, "collectionId");
  const bookId = text(formData, "bookId");
  if (!collectionId || !bookId) return;

  if (!(await staffCollection(collectionId))) return;

  await prisma.bookCollection.deleteMany({ where: { collectionId, bookId } });
  revalidateCollections(collectionId);
}

/**
 * Mueve un libro una posición arriba o abajo dentro de la lista,
 * intercambiando el orden con su vecino.
 */
export async function moveBookInCollectionAction(formData: FormData): Promise<void> {
  await assertUser();

  const collectionId = text(formData, "collectionId");
  const bookId = text(formData, "bookId");
  const direction = text(formData, "direction");
  if (!collectionId || !bookId || (direction !== "up" && direction !== "down")) return;

  if (!(await staffCollection(collectionId))) return;

  const items = await prisma.bookCollection.findMany({
    where: { collectionId },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: { bookId: true },
  });

  const index = items.findIndex((item) => item.bookId === bookId);
  if (index < 0) return;
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= items.length) return;

  await prisma.$transaction([
    prisma.bookCollection.update({
      where: { bookId_collectionId: { collectionId, bookId: items[index]!.bookId } },
      data: { position: target },
    }),
    prisma.bookCollection.update({
      where: { bookId_collectionId: { collectionId, bookId: items[target]!.bookId } },
      data: { position: index },
    }),
  ]);

  revalidateCollections(collectionId);
}
