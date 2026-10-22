"use server";

import { revalidatePath } from "next/cache";

import { assertUser, AuthError } from "../auth";
import { recordAudit } from "../audit";
import { CATEGORIES } from "../catalog";
import { findDuplicate } from "../duplicates";
import { prisma } from "../prisma";
import { checkRateLimit, clientKey, resetRateLimit } from "../rate-limit";
import { assertReader, ReaderAuthError } from "../reader-auth";
import {
  fieldErrors,
  purchaseSuggestionSchema,
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

/** Revalida las vistas donde aparecen las solicitudes de compra. */
function revalidateSuggestions(suggestionId?: string) {
  revalidatePath("/panel/solicitudes");
  revalidatePath("/panel/tareas");
  revalidatePath("/panel");
  revalidatePath("/mi-biblioteca/solicitudes");
  revalidatePath("/solicitar");
  if (suggestionId) revalidatePath(`/panel/solicitudes/${suggestionId}`);
}

function readSuggestion(formData: FormData) {
  return purchaseSuggestionSchema.safeParse({
    title: text(formData, "title"),
    author: text(formData, "author"),
    isbn: text(formData, "isbn"),
    reason: text(formData, "reason"),
    proposerName: text(formData, "proposerName"),
    proposerEmail: text(formData, "proposerEmail"),
  });
}

// ---------------------------------------------------------------------------
// Crear la solicitud
// ---------------------------------------------------------------------------

/**
 * Solicitud pública: cualquiera puede pedir un título que no está en el
 * catálogo (el alumnado, el profesorado, las familias). Se guardan el nombre
 * y el correo para poder responderle.
 */
export async function createPurchaseSuggestionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const key = await clientKey("purchase-suggestion");
  const limit = checkRateLimit(key);
  if (!limit.allowed) {
    const minutes = Math.max(1, Math.ceil(limit.retryAfterSeconds / 60));
    return {
      status: "error",
      message: "actions.tooManyAttempts",
      messageParams: { minutes },
    };
  }

  const parsed = readSuggestion(formData);
  if (!parsed.success) {
    return {
      status: "error",
      message: "actions.reviewFieldsBeforeSave",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const suggestion = await prisma.purchaseSuggestion.create({
    data: {
      title: parsed.data.title,
      author: parsed.data.author,
      isbn: parsed.data.isbn ?? null,
      reason: parsed.data.reason ?? null,
      proposerName: parsed.data.proposerName ?? null,
      proposerEmail: parsed.data.proposerEmail ?? null,
    },
  });

  resetRateLimit(key);
  await recordAudit({
    action: "PURCHASE_SUGGESTION_CREATE",
    entityType: "PurchaseSuggestion",
    entityId: suggestion.id,
    summary: `Solicitud de compra de «${suggestion.title}» de ${suggestion.author}`,
  });

  revalidateSuggestions(suggestion.id);
  return {
    status: "success",
    message: "actions.purchaseSuggestionCreated",
    messageParams: { title: suggestion.title },
  };
}

/** Solicitud desde «Mi biblioteca»: la persona lectora ya está identificada. */
export async function readerCreatePurchaseSuggestionAction(
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

  const parsed = readSuggestion(formData);
  if (!parsed.success) {
    return {
      status: "error",
      message: "actions.reviewFieldsBeforeSave",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const account = await prisma.reader.findUnique({ where: { id: reader.id } });
  if (!account) return { status: "error", message: "actions.readerGone" };

  const suggestion = await prisma.purchaseSuggestion.create({
    data: {
      title: parsed.data.title,
      author: parsed.data.author,
      isbn: parsed.data.isbn ?? null,
      reason: parsed.data.reason ?? null,
      readerId: account.id,
    },
  });

  await recordAudit({
    action: "READER_PURCHASE_SUGGESTION_CREATE",
    entityType: "PurchaseSuggestion",
    entityId: suggestion.id,
    summary: `${account.fullName} ha solicitado «${suggestion.title}» de ${suggestion.author}`,
    userId: null,
  });

  revalidateSuggestions(suggestion.id);
  return {
    status: "success",
    message: "actions.purchaseSuggestionCreated",
    messageParams: { title: suggestion.title },
  };
}

/** Solicitud desde el panel: la hace el propio personal. */
export async function staffCreatePurchaseSuggestionAction(
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

  const parsed = readSuggestion(formData);
  if (!parsed.success) {
    return {
      status: "error",
      message: "actions.reviewFieldsBeforeSave",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const suggestion = await prisma.purchaseSuggestion.create({
    data: {
      title: parsed.data.title,
      author: parsed.data.author,
      isbn: parsed.data.isbn ?? null,
      reason: parsed.data.reason ?? null,
      userId: user.id,
    },
  });

  await recordAudit({
    action: "PURCHASE_SUGGESTION_CREATE",
    entityType: "PurchaseSuggestion",
    entityId: suggestion.id,
    summary: `Solicitud de compra de «${suggestion.title}» de ${suggestion.author}`,
    userId: user.id,
  });

  revalidateSuggestions(suggestion.id);
  return {
    status: "success",
    message: "actions.purchaseSuggestionCreated",
    messageParams: { title: suggestion.title },
  };
}

// ---------------------------------------------------------------------------
// Resolver la solicitud
// ---------------------------------------------------------------------------

/**
 * Aprueba la solicitud: el título entra en el catálogo y la solicitud queda
 * resuelta. El personal puede ajustar la categoría y los ejemplares.
 */
export async function approvePurchaseSuggestionAction(
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

  const id = text(formData, "id");
  if (!id) return { status: "error", message: "actions.purchaseSuggestionNoId" };

  const suggestion = await prisma.purchaseSuggestion.findUnique({ where: { id } });
  if (!suggestion) {
    return { status: "error", message: "actions.purchaseSuggestionGone" };
  }
  if (suggestion.status !== "PENDING") {
    return { status: "error", message: "actions.purchaseSuggestionResolved" };
  }

  const rawCategory = text(formData, "category");
  const category = (CATEGORIES as readonly string[]).includes(rawCategory)
    ? rawCategory
    : "Referencia";

  const rawCopies = Number.parseInt(text(formData, "copies") || "1", 10);
  const copies = Number.isFinite(rawCopies) && rawCopies > 0 ? rawCopies : 1;

  // Si el título ya está en el catálogo no se duplica: la solicitud se
  // resuelve enlazando el libro que ya existe.
  const duplicate = await findDuplicate({
    title: suggestion.title,
    author: suggestion.author,
    isbn: suggestion.isbn ?? undefined,
  });

  const book = duplicate
    ? await prisma.book.findUnique({ where: { id: duplicate.id } })
    : await prisma.book.create({
        data: {
          title: suggestion.title,
          author: suggestion.author,
          isbn: suggestion.isbn,
          category,
          copies,
          createdById: user.id,
          updatedById: user.id,
        },
      });
  if (!book) {
    return { status: "error", message: "actions.bookNotFound" };
  }

  await prisma.purchaseSuggestion.update({
    where: { id },
    data: {
      status: "APPROVED",
      bookId: book.id,
      notes: text(formData, "notes") || null,
      resolvedAt: new Date(),
    },
  });

  await recordAudit({
    action: "PURCHASE_SUGGESTION_APPROVE",
    entityType: "PurchaseSuggestion",
    entityId: id,
    summary: duplicate
      ? `Aprobada la solicitud de «${suggestion.title}» de ${suggestion.author} (el título ya estaba en el catálogo)`
      : `Aprobada la solicitud de «${book.title}» de ${book.author} (incorporado al catálogo)`,
    userId: user.id,
  });

  revalidateSuggestions(id);
  revalidatePath("/panel/libros");
  revalidatePath("/catalogo");
  revalidatePath("/");
  revalidatePath(`/libro/${book.id}`);

  return {
    status: "success",
    message: "actions.purchaseSuggestionApproved",
    messageParams: { title: book.title },
  };
}

/** Descarta la solicitud: el título no entra en el catálogo. */
export async function rejectPurchaseSuggestionAction(
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

  const id = text(formData, "id");
  if (!id) return { status: "error", message: "actions.purchaseSuggestionNoId" };

  const suggestion = await prisma.purchaseSuggestion.findUnique({ where: { id } });
  if (!suggestion) {
    return { status: "error", message: "actions.purchaseSuggestionGone" };
  }
  if (suggestion.status !== "PENDING") {
    return { status: "error", message: "actions.purchaseSuggestionResolved" };
  }

  await prisma.purchaseSuggestion.update({
    where: { id },
    data: {
      status: "REJECTED",
      notes: text(formData, "notes") || null,
      resolvedAt: new Date(),
    },
  });

  await recordAudit({
    action: "PURCHASE_SUGGESTION_REJECT",
    entityType: "PurchaseSuggestion",
    entityId: id,
    summary: `Descartada la solicitud de «${suggestion.title}» de ${suggestion.author}`,
    userId: user.id,
  });

  revalidateSuggestions(id);
  return {
    status: "success",
    message: "actions.purchaseSuggestionRejected",
    messageParams: { title: suggestion.title },
  };
}
