"use server";

import { revalidatePath } from "next/cache";

import { recordAudit } from "../audit";
import { DEFAULT_LOAN_DAYS, READER_MAX_RENEWALS } from "../constants";
import { assertReader, ReaderAuthError } from "../reader-auth";
import { prisma } from "../prisma";
import type { ActionState } from "../validation";

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

function revalidateReaderArea(bookId?: string) {
  revalidatePath("/mi-biblioteca");
  revalidatePath("/mi-biblioteca/prestamos");
  revalidatePath("/mi-biblioteca/reservas");
  revalidatePath("/mi-biblioteca/historial");
  revalidatePath("/panel");
  revalidatePath("/panel/reservas");
  revalidatePath("/panel/lectores");
  revalidatePath("/");
  revalidatePath("/catalogo");
  if (bookId) revalidatePath(`/libro/${bookId}`);
}

/**
 * El lector o la lectora reserva un libro para sí mismo desde su área o desde
 * la ficha pública del libro. Puede reservar aunque haya ejemplares libres.
 */
export async function readerCreateReservationAction(
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

  const [book, account] = await Promise.all([
    prisma.book.findUnique({ where: { id: bookId } }),
    prisma.reader.findUnique({ where: { id: reader.id } }),
  ]);
  if (!book) return { status: "error", message: "actions.bookGone" };
  if (!account) return { status: "error", message: "actions.readerGone" };
  if (!account.active) {
    return { status: "error", message: "actions.readerInactive" };
  }
  if (account.suspendedUntil && account.suspendedUntil.getTime() > Date.now()) {
    return {
      status: "error",
      message: "actions.readerSuspendedUntil",
      messageParams: { date: account.suspendedUntil.toISOString().slice(0, 10) },
    };
  }

  const [alreadyReserved, activeLoan] = await Promise.all([
    prisma.reservation.findFirst({
      where: { bookId: book.id, readerId: reader.id, status: "ACTIVE" },
    }),
    prisma.loan.findFirst({
      where: { bookId: book.id, readerId: reader.id, returnedAt: null },
    }),
  ]);
  if (alreadyReserved) {
    return { status: "error", message: "actions.reservationDuplicate" };
  }
  if (activeLoan) {
    return { status: "error", message: "actions.readerAlreadyHasLoan" };
  }

  const reservation = await prisma.reservation.create({
    data: {
      bookId: book.id,
      readerId: reader.id,
    },
  });

  await recordAudit({
    action: "READER_RESERVATION_CREATE",
    entityType: "Reservation",
    entityId: reservation.id,
    summary: `${reader.fullName} ha reservado «${book.title}» desde «Mi biblioteca»`,
  });

  revalidateReaderArea(book.id);
  return { status: "success", message: "actions.readerReservationCreated" };
}

/** Anula una reserva propia desde «Mi biblioteca». */
export async function readerCancelReservationAction(
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

  const id = text(formData, "id");
  if (!id) return { status: "error", message: "actions.reservationNoId" };

  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: { book: true },
  });
  if (!reservation || reservation.readerId !== reader.id) {
    return { status: "error", message: "actions.reservationGone" };
  }
  if (reservation.status !== "ACTIVE") {
    return { status: "error", message: "actions.reservationResolved" };
  }

  await prisma.reservation.update({
    where: { id },
    data: { status: "CANCELLED", resolvedAt: new Date() },
  });
  await recordAudit({
    action: "READER_RESERVATION_CANCEL",
    entityType: "Reservation",
    entityId: id,
    summary: `${reader.fullName} ha anulado su reserva de «${reservation.book.title}»`,
  });

  revalidateReaderArea(reservation.bookId);
  return { status: "success", message: "actions.reservationCancelled" };
}

/**
 * Prórroga que pide la propia persona lectora.
 *
 * Límites: no más de `READER_MAX_RENEWALS` prórrogas sobre el préstamo y
 * bloqueo si otra persona tiene el libro reservado (le toca a ella).
 */
export async function readerRenewLoanAction(
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
  if (!id) return { status: "error", message: "actions.loanNoId" };

  const loan = await prisma.loan.findUnique({
    where: { id },
    include: { book: true },
  });
  if (!loan || loan.readerId !== reader.id) {
    return { status: "error", message: "actions.loanGone" };
  }
  if (loan.returnedAt) {
    return { status: "error", message: "actions.loanCannotRenew" };
  }
  if (loan.renewals >= READER_MAX_RENEWALS) {
    return {
      status: "error",
      message: "actions.readerRenewalLimit",
      messageParams: { max: READER_MAX_RENEWALS },
    };
  }

  const waiting = await prisma.reservation.count({
    where: {
      bookId: loan.bookId,
      status: "ACTIVE",
      NOT: { readerId: reader.id },
    },
  });
  if (waiting > 0) {
    return { status: "error", message: "actions.readerRenewalBlocked" };
  }

  const base = loan.dueAt.getTime() > Date.now() ? loan.dueAt : new Date();
  const dueAt = new Date(base.getTime() + DEFAULT_LOAN_DAYS * 24 * 60 * 60 * 1000);

  await prisma.loan.update({
    where: { id },
    data: { dueAt, renewals: { increment: 1 } },
  });
  await recordAudit({
    action: "READER_LOAN_RENEW",
    entityType: "Loan",
    entityId: id,
    summary: `${reader.fullName} ha prorrogado «${loan.book.title}» hasta el ${dueAt
      .toISOString()
      .slice(0, 10)}`,
  });

  revalidateReaderArea(loan.bookId);
  return { status: "success", message: "actions.loanRenewed" };
}
