"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { assertUser, AuthError } from "../auth";
import { recordAudit } from "../audit";
import { DEFAULT_LOAN_DAYS } from "../constants";
import { daysLate } from "../format";
import { prisma } from "../prisma";
import {
  fieldErrors,
  loanSchema,
  parseDateInput,
  reservationSchema,
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

function revalidateLoans(bookId?: string) {
  revalidatePath("/panel");
  revalidatePath("/panel/prestamos");
  revalidatePath("/panel/reservas");
  revalidatePath("/panel/lectores");
  revalidatePath("/");
  revalidatePath("/catalogo");
  if (bookId) {
    revalidatePath(`/libro/${bookId}`);
    revalidatePath(`/panel/libros/${bookId}/editar`);
  }
}

/** Ejemplares disponibles ahora mismo (total menos préstamos sin devolver). */
async function availableCopies(bookId: string, copies: number): Promise<number> {
  const onLoan = await prisma.loan.count({
    where: { bookId, returnedAt: null },
  });
  return copies - onLoan;
}

export async function createLoanAction(
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

  const parsed = loanSchema.safeParse({
    bookId: text(formData, "bookId"),
    readerId: text(formData, "readerId"),
    dueAt: text(formData, "dueAt"),
    notes: text(formData, "notes"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "actions.reviewFieldsBeforeSave",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const dueAt = parseDateInput(parsed.data.dueAt);
  if (!dueAt) {
    return { status: "error", message: "actions.loanInvalidDate" };
  }

  const [book, reader] = await Promise.all([
    prisma.book.findUnique({ where: { id: parsed.data.bookId } }),
    prisma.reader.findUnique({ where: { id: parsed.data.readerId } }),
  ]);
  if (!book) return { status: "error", message: "actions.bookGone" };
  if (!reader) return { status: "error", message: "actions.readerGone" };
  if (!reader.active) {
    return { status: "error", message: "actions.readerInactive" };
  }
  if (reader.suspendedUntil && reader.suspendedUntil.getTime() > Date.now()) {
    return {
      status: "error",
      message: "actions.readerSuspendedUntil",
      messageParams: { date: reader.suspendedUntil.toISOString().slice(0, 10) },
    };
  }

  const available = await availableCopies(book.id, book.copies);
  if (available <= 0) {
    return {
      status: "error",
      message: "actions.noCopiesLeft",
      messageParams: { title: book.title },
    };
  }

  const loan = await prisma.loan.create({
    data: {
      bookId: book.id,
      readerId: reader.id,
      dueAt,
      notes: parsed.data.notes ?? null,
      createdById: user.id,
    },
  });

  // Si el lector tenía reservado este libro, la reserva queda servida.
  const pending = await prisma.reservation.findFirst({
    where: { bookId: book.id, readerId: reader.id, status: "ACTIVE" },
  });
  if (pending) {
    await prisma.reservation.update({
      where: { id: pending.id },
      data: { status: "FULFILLED", resolvedAt: new Date() },
    });
  }

  await recordAudit({
    action: "LOAN_CREATE",
    entityType: "Loan",
    entityId: loan.id,
    summary: `Prestado «${book.title}» a ${reader.fullName}`,
    userId: user.id,
  });

  revalidateLoans(book.id);
  redirect("/panel/prestamos?aviso=creado");
}

export async function returnLoanAction(
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

  const loanId = text(formData, "id");
  if (!loanId) return { status: "error", message: "actions.loanNoId" };

  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
    include: { book: true, reader: true },
  });
  if (!loan) return { status: "error", message: "actions.loanGone" };
  if (loan.returnedAt) {
    return { status: "success", message: "actions.loanAlreadyReturned" };
  }

  const now = new Date();
  await prisma.loan.update({
    where: { id: loanId },
    data: { returnedAt: now },
  });

  // Devolución tardía: se devuelve el aviso para que el personal decida si
  // sanciona al lector (la duración la elige en el propio formulario).
  const lateDays = daysLate(loan.dueAt, now);

  await recordAudit({
    action: "LOAN_RETURN",
    entityType: "Loan",
    entityId: loanId,
    summary:
      lateDays > 0
        ? `Devuelto con ${lateDays} día(s) de retraso «${loan.book.title}» por ${loan.reader.fullName}`
        : `Devuelto «${loan.book.title}» por ${loan.reader.fullName}`,
    userId: user.id,
  });

  revalidateLoans(loan.bookId);
  if (lateDays > 0) {
    return {
      status: "warning",
      message: "actions.loanReturnedLate",
      messageParams: { title: loan.book.title, days: lateDays },
      lateReturn: {
        readerId: loan.reader.id,
        readerName: loan.reader.fullName,
        days: lateDays,
      },
    };
  }
  return {
    status: "success",
    message: "actions.loanReturned",
    messageParams: { title: loan.book.title },
  };
}

/** Prórroga: alarga la fecha de devolución los días indicados. */
export async function renewLoanAction(
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

  const loanId = text(formData, "id");
  const days = Number.parseInt(text(formData, "days") || String(DEFAULT_LOAN_DAYS), 10);
  if (!loanId) return { status: "error", message: "actions.loanNoId" };

  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
    include: { book: true },
  });
  if (!loan) return { status: "error", message: "actions.loanGone" };
  if (loan.returnedAt) {
    return { status: "error", message: "actions.loanCannotRenew" };
  }

  const base = loan.dueAt.getTime() > Date.now() ? loan.dueAt : new Date();
  const dueAt = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);

  await prisma.loan.update({ where: { id: loanId }, data: { dueAt } });
  await recordAudit({
    action: "LOAN_RENEW",
    entityType: "Loan",
    entityId: loanId,
    summary: `Prórroga de «${loan.book.title}» hasta el ${dueAt.toISOString().slice(0, 10)}`,
    userId: user.id,
  });

  revalidateLoans(loan.bookId);
  return { status: "success", message: "actions.loanRenewed" };
}

// ---------------------------------------------------------------------------
// Reservas
// ---------------------------------------------------------------------------

export async function createReservationAction(
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

  const parsed = reservationSchema.safeParse({
    bookId: text(formData, "bookId"),
    readerId: text(formData, "readerId"),
    notes: text(formData, "notes"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "actions.reviewFieldsBeforeSave",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const [book, reader] = await Promise.all([
    prisma.book.findUnique({ where: { id: parsed.data.bookId } }),
    prisma.reader.findUnique({ where: { id: parsed.data.readerId } }),
  ]);
  if (!book) return { status: "error", message: "actions.bookGone" };
  if (!reader) return { status: "error", message: "actions.readerGone" };

  const already = await prisma.reservation.findFirst({
    where: { bookId: book.id, readerId: reader.id, status: "ACTIVE" },
  });
  if (already) {
    return {
      status: "error",
      message: "actions.reservationDuplicate",
    };
  }

  const reservation = await prisma.reservation.create({
    data: {
      bookId: book.id,
      readerId: reader.id,
      notes: parsed.data.notes ?? null,
      createdById: user.id,
    },
  });

  await recordAudit({
    action: "RESERVATION_CREATE",
    entityType: "Reservation",
    entityId: reservation.id,
    summary: `Reservado «${book.title}» para ${reader.fullName}`,
    userId: user.id,
  });

  revalidateLoans(book.id);
  redirect("/panel/reservas?aviso=creada");
}

export async function cancelReservationAction(
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
  if (!id) return { status: "error", message: "actions.reservationNoId" };

  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: { book: true, reader: true },
  });
  if (!reservation) return { status: "error", message: "actions.reservationGone" };
  if (reservation.status !== "ACTIVE") {
    return { status: "error", message: "actions.reservationResolved" };
  }

  await prisma.reservation.update({
    where: { id },
    data: { status: "CANCELLED", resolvedAt: new Date() },
  });
  await recordAudit({
    action: "RESERVATION_CANCEL",
    entityType: "Reservation",
    entityId: id,
    summary: `Anulada la reserva de «${reservation.book.title}» de ${reservation.reader.fullName}`,
    userId: user.id,
  });

  revalidateLoans(reservation.bookId);
  return { status: "success", message: "actions.reservationCancelled" };
}

/** Sirve una reserva: crea el préstamo y la marca como atendida. */
export async function fulfillReservationAction(
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
  if (!id) return { status: "error", message: "actions.reservationNoId" };

  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: { book: true, reader: true },
  });
  if (!reservation) return { status: "error", message: "actions.reservationGone" };
  if (reservation.status !== "ACTIVE") {
    return { status: "error", message: "actions.reservationResolved" };
  }

  if (
    reservation.reader.suspendedUntil &&
    reservation.reader.suspendedUntil.getTime() > Date.now()
  ) {
    return {
      status: "error",
      message: "actions.reservationReaderSuspended",
      messageParams: { reader: reservation.reader.fullName },
    };
  }

  const available = await availableCopies(
    reservation.bookId,
    reservation.book.copies,
  );
  if (available <= 0) {
    return {
      status: "error",
      message: "actions.noCopiesYet",
      messageParams: { title: reservation.book.title },
    };
  }

  const dueAt = new Date(Date.now() + DEFAULT_LOAN_DAYS * 24 * 60 * 60 * 1000);

  await prisma.loan.create({
    data: {
      bookId: reservation.bookId,
      readerId: reservation.readerId,
      dueAt,
      notes: `Desde reserva. ${reservation.notes ?? ""}`.trim(),
      createdById: user.id,
    },
  });
  await prisma.reservation.update({
    where: { id },
    data: { status: "FULFILLED", resolvedAt: new Date() },
  });

  await recordAudit({
    action: "RESERVATION_FULFILL",
    entityType: "Reservation",
    entityId: id,
    summary: `Servida la reserva de «${reservation.book.title}» a ${reservation.reader.fullName}`,
    userId: user.id,
  });

  revalidateLoans(reservation.bookId);
  return {
    status: "success",
    message: "actions.loanCreatedFor",
    messageParams: { reader: reservation.reader.fullName },
  };
}
