"use server";

import { revalidatePath } from "next/cache";

import { getCurrentReader } from "../reader-auth";
import { assertUser, AuthError } from "../auth";
import { recordAudit } from "../audit";
import { prisma } from "../prisma";
import { fieldErrors, reviewSchema, type ActionState } from "../validation";

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function revalidateReviews(bookId: string) {
  revalidatePath(`/libro/${bookId}`);
  revalidatePath("/catalogo");
}

export async function createOrUpdateReviewAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const reader = await getCurrentReader();
  if (!reader) {
    return {
      status: "error",
      message: "reader.paraValorarDebesIniciarSesionEnMiBiblioteca",
    };
  }
  if (reader.pinMustChange) {
    return {
      status: "error",
      message: "reader.paraValorarDebesCambiarElPinPrimero",
    };
  }

  const parsed = reviewSchema.safeParse({
    bookId: text(formData, "bookId"),
    rating: text(formData, "rating"),
    comment: text(formData, "comment"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "actions.reviewFieldsBeforeSave",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const book = await prisma.book.findUnique({ where: { id: parsed.data.bookId } });
  if (!book) {
    return { status: "error", message: "actions.bookGone" };
  }

  const rating = Number(parsed.data.rating);

  await prisma.review.upsert({
    where: {
      bookId_readerId: {
        bookId: book.id,
        readerId: reader.id,
      },
    },
    create: {
      bookId: book.id,
      readerId: reader.id,
      rating,
      comment: parsed.data.comment?.trim() ? parsed.data.comment.trim() : null,
      approved: true,
    },
    update: {
      rating,
      comment: parsed.data.comment?.trim() ? parsed.data.comment.trim() : null,
      updatedAt: new Date(),
    },
  });

  revalidateReviews(book.id);
  return {
    status: "success",
    message: "review.valoracionGuardada",
  };
}

export async function deleteReviewAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const reader = await getCurrentReader();
  if (!reader) {
    return { status: "error", message: "actions.sessionExpired" };
  }

  const bookId = text(formData, "bookId");
  if (!bookId) {
    return { status: "error", message: "actions.bookNoId" };
  }

  const review = await prisma.review.findUnique({
    where: {
      bookId_readerId: {
        bookId,
        readerId: reader.id,
      },
    },
  });

  if (!review) {
    return { status: "error", message: "review.noReviewToDelete" };
  }

  await prisma.review.delete({
    where: {
      bookId_readerId: {
        bookId,
        readerId: reader.id,
      },
    },
  });

  revalidateReviews(bookId);
  return {
    status: "success",
    message: "review.valoracionEliminada",
  };
}

/** Moderación del personal: elimina cualquier valoración. */
export async function deleteReviewAsStaffAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let user;
  try {
    user = await assertUser();
  } catch (error) {
    if (error instanceof AuthError) {
      return { status: "error", message: "actions.sessionExpired" };
    }
    throw error;
  }

  const id = text(formData, "id");
  if (!id) return { status: "error", message: "actions.reviewNoId" };

  const review = await prisma.review.findUnique({
    where: { id },
    include: { book: { select: { title: true } }, reader: { select: { fullName: true } } },
  });
  if (!review) return { status: "error", message: "review.noReviewToDelete" };

  await prisma.review.delete({ where: { id } });
  await recordAudit({
    action: "REVIEW_DELETE",
    entityType: "Review",
    entityId: id,
    summary: `Eliminada la valoración de ${review.reader.fullName} sobre «${review.book.title}»`,
    userId: user.id,
  });

  revalidateReviews(review.bookId);
  revalidatePath("/panel/resenas");
  return { status: "success", message: "review.valoracionEliminada" };
}
