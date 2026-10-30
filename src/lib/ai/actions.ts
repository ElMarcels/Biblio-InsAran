import "server-only";

import crypto from "node:crypto";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { hashPassword, isManagerRole } from "../auth";
import { recordAudit } from "../audit";
import { CATEGORIES, LANGUAGES } from "../catalog";
import {
  DEFAULT_LOAN_DAYS,
  READER_MAX_RENEWALS,
} from "../constants";
import { findDuplicate } from "../duplicates";
import {
  addSuspensionDuration,
  PERMANENT_SUSPENSION_DATE,
} from "../format";
import { NOTIFICATION_TEXTS, notifyReader } from "../notifications";
import { prisma } from "../prisma";
import { revokeReaderSessions } from "../reader-auth";
import { nextCardNumber } from "../reader-card";
import { slugify } from "../validation";
import { ACTION_TTL_MINUTES } from "./config";
import type {
  AssistantActor,
  AssistantScope,
  ProposedActionView,
} from "./types";

const id = z.string().trim().min(1).max(60);
const optionalText = (max: number) =>
  z.string().trim().max(max).optional();

export class ActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ActionError";
  }
}

type ActionDefinition = {
  type: string;
  scope: Exclude<AssistantScope, "PUBLIC">;
  managerOnly?: boolean;
  risk: "medium" | "high";
  schema: z.ZodTypeAny;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  describe: (payload: any, actor: AssistantActor) => Promise<string>;
  execute: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: any,
    actor: AssistantActor,
  ) => Promise<{ message: string; bookIds?: string[] }>;
};

function readerOf(actor: AssistantActor) {
  if (actor.scope !== "READER") {
    throw new ActionError("Esta acción solo está disponible en «Mi biblioteca».");
  }
  return actor.readerId;
}

function staffOf(actor: AssistantActor) {
  if (actor.scope !== "STAFF") {
    throw new ActionError("Esta acción solo está disponible en el panel de gestión.");
  }
  return actor;
}

function managerOf(actor: AssistantActor) {
  const staff = staffOf(actor);
  if (!isManagerRole(staff.role)) {
    throw new ActionError("Solo la dirección puede realizar esta acción.");
  }
  return staff;
}

async function bookOrThrow(bookId: string) {
  const book = await prisma.book.findUnique({ where: { id: bookId } });
  if (!book) throw new ActionError("Ese libro ya no existe.");
  return book;
}

async function readerOrThrow(readerId: string) {
  const reader = await prisma.reader.findUnique({ where: { id: readerId } });
  if (!reader) throw new ActionError("Ese lector o lectora ya no existe.");
  return reader;
}

async function loanOrThrow(loanId: string) {
  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
    include: { book: true, reader: true },
  });
  if (!loan) throw new ActionError("Ese préstamo ya no existe.");
  return loan;
}

async function reservationOrThrow(reservationId: string) {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { book: true, reader: true },
  });
  if (!reservation) throw new ActionError("Esa reserva ya no existe.");
  return reservation;
}

function addDays(from: Date, days: number): Date {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}

function iso(value: Date | null | undefined): string {
  return value ? value.toISOString().slice(0, 10) : "—";
}

async function uniqueCollectionSlug(name: string): Promise<string> {
  const base = slugify(name) || "lista";
  let candidate = base;
  let suffix = 2;
  for (;;) {
    const existing = await prisma.collection.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

function temporaryPassword(): string {
  return crypto.randomBytes(9).toString("base64url").slice(0, 12);
}

function revalidateAll() {
  const paths = [
    "/",
    "/catalogo",
    "/colecciones",
    "/panel",
    "/panel/tareas",
    "/panel/libros",
    "/panel/lectores",
    "/panel/prestamos",
    "/panel/reservas",
    "/panel/solicitudes",
    "/panel/resenas",
    "/panel/colecciones",
    "/panel/usuarios",
    "/panel/actividad",
    "/panel/changelog",
    "/mi-biblioteca",
    "/mi-biblioteca/prestamos",
    "/mi-biblioteca/reservas",
    "/mi-biblioteca/historial",
    "/mi-biblioteca/listas",
    "/mi-biblioteca/notificaciones",
    "/mi-biblioteca/solicitudes",
  ];
  for (const path of paths) revalidatePath(path);
}

// ---------------------------------------------------------------------------
// Definiciones de acciones
// ---------------------------------------------------------------------------

const definitions: ActionDefinition[] = [
  // ------------------------------ Lector/a ---------------------------------
  {
    type: "reader.renew_loan",
    scope: "READER",
    risk: "medium",
    schema: z.object({ loanId: id }),
    async describe(payload, actor) {
      const readerId = readerOf(actor);
      const loan = await loanOrThrow(payload.loanId);
      if (loan.readerId !== readerId) {
        throw new ActionError("Ese préstamo no es tuyo.");
      }
      return `Prorrogar «${loan.book.title}» ${DEFAULT_LOAN_DAYS} días más.`;
    },
    async execute(payload, actor) {
      const readerId = readerOf(actor);
      const loan = await loanOrThrow(payload.loanId);
      if (loan.readerId !== readerId) {
        throw new ActionError("Ese préstamo no es tuyo.");
      }
      if (loan.returnedAt) {
        throw new ActionError("Ese préstamo ya está devuelto.");
      }
      if (loan.renewals >= READER_MAX_RENEWALS) {
        throw new ActionError(
          `Has alcanzado el máximo de ${READER_MAX_RENEWALS} prórrogas.`,
        );
      }
      const waiting = await prisma.reservation.count({
        where: {
          bookId: loan.bookId,
          status: "ACTIVE",
          NOT: { readerId },
        },
      });
      if (waiting > 0) {
        throw new ActionError(
          "No se puede prorrogar: otra persona tiene el libro reservado.",
        );
      }
      const base = loan.dueAt.getTime() > Date.now() ? loan.dueAt : new Date();
      const dueAt = addDays(base, DEFAULT_LOAN_DAYS);
      await prisma.loan.update({
        where: { id: loan.id },
        data: { dueAt, renewals: { increment: 1 } },
      });
      await recordAudit({
        action: "READER_LOAN_RENEW",
        entityType: "Loan",
        entityId: loan.id,
        summary: `Prórroga de «${loan.book.title}» hasta el ${iso(dueAt)} (desde Aran)`,
      });
      return {
        message: `Préstamo prorrogado hasta el ${iso(dueAt)}.`,
        bookIds: [loan.bookId],
      };
    },
  },
  {
    type: "reader.reserve_book",
    scope: "READER",
    risk: "medium",
    schema: z.object({ bookId: id }),
    async describe(payload, actor) {
      readerOf(actor);
      const book = await bookOrThrow(payload.bookId);
      return `Reservar «${book.title}» de ${book.author} para ti.`;
    },
    async execute(payload, actor) {
      const readerId = readerOf(actor);
      const [book, reader] = await Promise.all([
        bookOrThrow(payload.bookId),
        readerOrThrow(readerId),
      ]);
      if (!reader.active) throw new ActionError("Tu cuenta está desactivada.");
      if (reader.suspendedUntil && reader.suspendedUntil.getTime() > Date.now()) {
        throw new ActionError(
          `Tienes el préstamo suspendido hasta el ${iso(reader.suspendedUntil)}.`,
        );
      }
      const [already, activeLoan] = await Promise.all([
        prisma.reservation.findFirst({
          where: { bookId: book.id, readerId, status: "ACTIVE" },
        }),
        prisma.loan.findFirst({
          where: { bookId: book.id, readerId, returnedAt: null },
        }),
      ]);
      if (already) throw new ActionError("Ya tienes una reserva activa de ese libro.");
      if (activeLoan) throw new ActionError("Ya tienes ese libro en préstamo.");
      const reservation = await prisma.reservation.create({
        data: { bookId: book.id, readerId },
      });
      await recordAudit({
        action: "READER_RESERVATION_CREATE",
        entityType: "Reservation",
        entityId: reservation.id,
        summary: `Reserva de «${book.title}» creada desde Aran`,
      });
      return {
        message: `Reserva de «${book.title}» creada.`,
        bookIds: [book.id],
      };
    },
  },
  {
    type: "reader.cancel_reservation",
    scope: "READER",
    risk: "medium",
    schema: z.object({ reservationId: id }),
    async describe(payload, actor) {
      const readerId = readerOf(actor);
      const reservation = await reservationOrThrow(payload.reservationId);
      if (reservation.readerId !== readerId) {
        throw new ActionError("Esa reserva no es tuya.");
      }
      return `Anular tu reserva de «${reservation.book.title}».`;
    },
    async execute(payload, actor) {
      const readerId = readerOf(actor);
      const reservation = await reservationOrThrow(payload.reservationId);
      if (reservation.readerId !== readerId) {
        throw new ActionError("Esa reserva no es tuya.");
      }
      if (reservation.status !== "ACTIVE") {
        throw new ActionError("Esa reserva ya está resuelta.");
      }
      await prisma.reservation.update({
        where: { id: reservation.id },
        data: { status: "CANCELLED", resolvedAt: new Date() },
      });
      await recordAudit({
        action: "READER_RESERVATION_CANCEL",
        entityType: "Reservation",
        entityId: reservation.id,
        summary: `Reserva de «${reservation.book.title}» anulada desde Aran`,
      });
      return { message: "Reserva anulada." };
    },
  },
  {
    type: "reader.create_list",
    scope: "READER",
    risk: "medium",
    schema: z.object({
      name: z.string().trim().min(1).max(60),
      description: optionalText(300),
    }),
    async describe(payload) {
      return `Crear tu lista privada «${payload.name}».`;
    },
    async execute(payload, actor) {
      const readerId = readerOf(actor);
      const collection = await prisma.collection.create({
        data: {
          name: payload.name,
          description: payload.description ?? null,
          slug: await uniqueCollectionSlug(payload.name),
          ownerReaderId: readerId,
        },
      });
      await recordAudit({
        action: "READER_COLLECTION_CREATE",
        entityType: "Collection",
        entityId: collection.id,
        summary: `Lista privada «${collection.name}» creada desde Aran`,
      });
      return { message: `Lista «${collection.name}» creada.` };
    },
  },
  {
    type: "reader.add_to_list",
    scope: "READER",
    risk: "medium",
    schema: z.object({ collectionId: id, bookId: id }),
    async describe(payload, actor) {
      const readerId = readerOf(actor);
      const [collection, book] = await Promise.all([
        prisma.collection.findUnique({ where: { id: payload.collectionId } }),
        bookOrThrow(payload.bookId),
      ]);
      if (!collection || collection.ownerReaderId !== readerId) {
        throw new ActionError("Esa lista no es tuya.");
      }
      return `Añadir «${book.title}» a tu lista «${collection.name}».`;
    },
    async execute(payload, actor) {
      const readerId = readerOf(actor);
      const [collection, book] = await Promise.all([
        prisma.collection.findUnique({ where: { id: payload.collectionId } }),
        bookOrThrow(payload.bookId),
      ]);
      if (!collection || collection.ownerReaderId !== readerId) {
        throw new ActionError("Esa lista no es tuya.");
      }
      const last = await prisma.bookCollection.findFirst({
        where: { collectionId: collection.id },
        orderBy: { position: "desc" },
        select: { position: true },
      });
      await prisma.bookCollection.upsert({
        where: {
          bookId_collectionId: {
            bookId: book.id,
            collectionId: collection.id,
          },
        },
        create: {
          bookId: book.id,
          collectionId: collection.id,
          position: (last?.position ?? 0) + 1,
        },
        update: {},
      });
      return { message: `«${book.title}» añadido a «${collection.name}».` };
    },
  },
  {
    type: "reader.remove_from_list",
    scope: "READER",
    risk: "medium",
    schema: z.object({ collectionId: id, bookId: id }),
    async describe(payload, actor) {
      const readerId = readerOf(actor);
      const collection = await prisma.collection.findUnique({
        where: { id: payload.collectionId },
      });
      if (!collection || collection.ownerReaderId !== readerId) {
        throw new ActionError("Esa lista no es tuya.");
      }
      const book = await bookOrThrow(payload.bookId);
      return `Quitar «${book.title}» de tu lista «${collection.name}».`;
    },
    async execute(payload, actor) {
      const readerId = readerOf(actor);
      const collection = await prisma.collection.findUnique({
        where: { id: payload.collectionId },
      });
      if (!collection || collection.ownerReaderId !== readerId) {
        throw new ActionError("Esa lista no es tuya.");
      }
      await prisma.bookCollection.deleteMany({
        where: { collectionId: collection.id, bookId: payload.bookId },
      });
      return { message: `Libro quitado de «${collection.name}».` };
    },
  },
  {
    type: "reader.suggest_purchase",
    scope: "READER",
    risk: "medium",
    schema: z.object({
      title: z.string().trim().min(1).max(220),
      author: z.string().trim().min(1).max(180),
      isbn: optionalText(32),
      reason: optionalText(500),
    }),
    async describe(payload) {
      return `Enviar una solicitud de compra de «${payload.title}» de ${payload.author}.`;
    },
    async execute(payload, actor) {
      const readerId = readerOf(actor);
      const suggestion = await prisma.purchaseSuggestion.create({
        data: {
          title: payload.title,
          author: payload.author,
          isbn: payload.isbn ?? null,
          reason: payload.reason ?? null,
          readerId,
        },
      });
      await recordAudit({
        action: "READER_PURCHASE_SUGGESTION_CREATE",
        entityType: "PurchaseSuggestion",
        entityId: suggestion.id,
        summary: `Solicitud de compra de «${suggestion.title}» desde Aran`,
      });
      return { message: "Solicitud de compra enviada." };
    },
  },
  {
    type: "reader.mark_notification_read",
    scope: "READER",
    risk: "medium",
    schema: z.object({ notificationId: id }),
    async describe(payload, actor) {
      const readerId = readerOf(actor);
      const notification = await prisma.notification.findUnique({
        where: { id: payload.notificationId },
      });
      if (!notification || notification.readerId !== readerId) {
        throw new ActionError("Ese aviso no es tuyo.");
      }
      return `Marcar como leído el aviso «${notification.subject}».`;
    },
    async execute(payload, actor) {
      const readerId = readerOf(actor);
      const notification = await prisma.notification.findUnique({
        where: { id: payload.notificationId },
      });
      if (!notification || notification.readerId !== readerId) {
        throw new ActionError("Ese aviso no es tuyo.");
      }
      await prisma.notification.update({
        where: { id: notification.id },
        data: { readAt: new Date() },
      });
      return { message: "Aviso marcado como leído." };
    },
  },

  // ------------------------------- Personal --------------------------------
  {
    type: "staff.create_loan",
    scope: "STAFF",
    risk: "medium",
    schema: z.object({
      bookId: id,
      readerId: id,
      dueAt: z.string().trim().optional(),
      notes: optionalText(500),
    }),
    async describe(payload) {
      const [book, reader] = await Promise.all([
        bookOrThrow(payload.bookId),
        readerOrThrow(payload.readerId),
      ]);
      const due = payload.dueAt
        ? new Date(`${payload.dueAt}T23:59:59.999Z`)
        : addDays(new Date(), DEFAULT_LOAN_DAYS);
      return `Prestar «${book.title}» a ${reader.fullName} hasta el ${iso(due)}.`;
    },
    async execute(payload, actor) {
      const user = staffOf(actor);
      const [book, reader] = await Promise.all([
        bookOrThrow(payload.bookId),
        readerOrThrow(payload.readerId),
      ]);
      if (!reader.active) throw new ActionError("Ese lector está desactivado.");
      if (reader.suspendedUntil && reader.suspendedUntil.getTime() > Date.now()) {
        throw new ActionError(
          `Ese lector tiene el préstamo suspendido hasta el ${iso(reader.suspendedUntil)}.`,
        );
      }
      const onLoan = await prisma.loan.count({
        where: { bookId: book.id, returnedAt: null },
      });
      if (book.copies - onLoan <= 0) {
        throw new ActionError(`No quedan ejemplares de «${book.title}».`);
      }
      const dueAt = payload.dueAt
        ? new Date(`${payload.dueAt}T23:59:59.999Z`)
        : addDays(new Date(), DEFAULT_LOAN_DAYS);
      if (Number.isNaN(dueAt.getTime())) {
        throw new ActionError("La fecha de devolución no es válida.");
      }
      const loan = await prisma.loan.create({
        data: {
          bookId: book.id,
          readerId: reader.id,
          dueAt,
          notes: payload.notes ?? null,
          createdById: user.userId,
        },
      });
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
        action: "ASSISTANT_LOAN_CREATE",
        entityType: "Loan",
        entityId: loan.id,
        summary: `Prestado «${book.title}» a ${reader.fullName} desde Aran`,
        userId: user.userId,
      });
      const texts = NOTIFICATION_TEXTS.loan({
        name: reader.fullName,
        title: book.title,
        dueAt,
      });
      await notifyReader({
        reader: { id: reader.id, fullName: reader.fullName, email: reader.email },
        kind: "loan",
        subject: texts.subject,
        body: texts.body,
      });
      return {
        message: `Préstamo registrado para ${reader.fullName} hasta el ${iso(dueAt)}.`,
        bookIds: [book.id],
      };
    },
  },
  {
    type: "staff.return_loan",
    scope: "STAFF",
    risk: "medium",
    schema: z.object({ loanId: id }),
    async describe(payload) {
      const loan = await loanOrThrow(payload.loanId);
      return `Marcar como devuelto «${loan.book.title}» (${loan.reader.fullName}).`;
    },
    async execute(payload, actor) {
      const user = staffOf(actor);
      const loan = await loanOrThrow(payload.loanId);
      if (loan.returnedAt) throw new ActionError("Ese préstamo ya estaba devuelto.");
      await prisma.loan.update({
        where: { id: loan.id },
        data: { returnedAt: new Date() },
      });
      await recordAudit({
        action: "ASSISTANT_LOAN_RETURN",
        entityType: "Loan",
        entityId: loan.id,
        summary: `Devuelto «${loan.book.title}» desde Aran`,
        userId: user.userId,
      });
      return { message: `«${loan.book.title}» marcado como devuelto.` };
    },
  },
  {
    type: "staff.renew_loan",
    scope: "STAFF",
    risk: "medium",
    schema: z.object({
      loanId: id,
      days: z.number().int().min(1).max(120).optional(),
    }),
    async describe(payload) {
      const loan = await loanOrThrow(payload.loanId);
      const days = payload.days ?? DEFAULT_LOAN_DAYS;
      return `Prorrogar «${loan.book.title}» ${days} días.`;
    },
    async execute(payload, actor) {
      const user = staffOf(actor);
      const loan = await loanOrThrow(payload.loanId);
      if (loan.returnedAt) throw new ActionError("Ese préstamo ya está devuelto.");
      const days = payload.days ?? DEFAULT_LOAN_DAYS;
      const base = loan.dueAt.getTime() > Date.now() ? loan.dueAt : new Date();
      const dueAt = addDays(base, days);
      await prisma.loan.update({
        where: { id: loan.id },
        data: { dueAt, renewals: { increment: 1 } },
      });
      await recordAudit({
        action: "ASSISTANT_LOAN_RENEW",
        entityType: "Loan",
        entityId: loan.id,
        summary: `Prórroga de «${loan.book.title}» hasta el ${iso(dueAt)} desde Aran`,
        userId: user.userId,
      });
      return { message: `Préstamo prorrogado hasta el ${iso(dueAt)}.` };
    },
  },
  {
    type: "staff.create_reservation",
    scope: "STAFF",
    risk: "medium",
    schema: z.object({
      bookId: id,
      readerId: id,
      notes: optionalText(500),
    }),
    async describe(payload) {
      const [book, reader] = await Promise.all([
        bookOrThrow(payload.bookId),
        readerOrThrow(payload.readerId),
      ]);
      return `Reservar «${book.title}» para ${reader.fullName}.`;
    },
    async execute(payload, actor) {
      const user = staffOf(actor);
      const [book, reader] = await Promise.all([
        bookOrThrow(payload.bookId),
        readerOrThrow(payload.readerId),
      ]);
      const already = await prisma.reservation.findFirst({
        where: { bookId: book.id, readerId: reader.id, status: "ACTIVE" },
      });
      if (already) throw new ActionError("Ya existe una reserva activa.");
      const reservation = await prisma.reservation.create({
        data: {
          bookId: book.id,
          readerId: reader.id,
          notes: payload.notes ?? null,
          createdById: user.userId,
        },
      });
      await recordAudit({
        action: "ASSISTANT_RESERVATION_CREATE",
        entityType: "Reservation",
        entityId: reservation.id,
        summary: `Reservado «${book.title}» para ${reader.fullName} desde Aran`,
        userId: user.userId,
      });
      return { message: `Reserva creada para ${reader.fullName}.` };
    },
  },
  {
    type: "staff.cancel_reservation",
    scope: "STAFF",
    risk: "medium",
    schema: z.object({ reservationId: id }),
    async describe(payload) {
      const reservation = await reservationOrThrow(payload.reservationId);
      return `Anular la reserva de «${reservation.book.title}» de ${reservation.reader.fullName}.`;
    },
    async execute(payload, actor) {
      const user = staffOf(actor);
      const reservation = await reservationOrThrow(payload.reservationId);
      if (reservation.status !== "ACTIVE") {
        throw new ActionError("Esa reserva ya está resuelta.");
      }
      await prisma.reservation.update({
        where: { id: reservation.id },
        data: { status: "CANCELLED", resolvedAt: new Date() },
      });
      await recordAudit({
        action: "ASSISTANT_RESERVATION_CANCEL",
        entityType: "Reservation",
        entityId: reservation.id,
        summary: `Anulada la reserva de «${reservation.book.title}» desde Aran`,
        userId: user.userId,
      });
      return { message: "Reserva anulada." };
    },
  },
  {
    type: "staff.fulfill_reservation",
    scope: "STAFF",
    risk: "medium",
    schema: z.object({ reservationId: id }),
    async describe(payload) {
      const reservation = await reservationOrThrow(payload.reservationId);
      return `Servir la reserva de «${reservation.book.title}» a ${reservation.reader.fullName} y crear el préstamo.`;
    },
    async execute(payload, actor) {
      const user = staffOf(actor);
      const reservation = await reservationOrThrow(payload.reservationId);
      if (reservation.status !== "ACTIVE") {
        throw new ActionError("Esa reserva ya está resuelta.");
      }
      if (
        reservation.reader.suspendedUntil &&
        reservation.reader.suspendedUntil.getTime() > Date.now()
      ) {
        throw new ActionError("Ese lector tiene el préstamo suspendido.");
      }
      const onLoan = await prisma.loan.count({
        where: { bookId: reservation.bookId, returnedAt: null },
      });
      if (reservation.book.copies - onLoan <= 0) {
        throw new ActionError("No hay ejemplares disponibles todavía.");
      }
      const dueAt = addDays(new Date(), DEFAULT_LOAN_DAYS);
      await prisma.loan.create({
        data: {
          bookId: reservation.bookId,
          readerId: reservation.readerId,
          dueAt,
          notes: `Desde reserva. ${reservation.notes ?? ""}`.trim(),
          createdById: user.userId,
        },
      });
      await prisma.reservation.update({
        where: { id: reservation.id },
        data: { status: "FULFILLED", resolvedAt: new Date() },
      });
      await recordAudit({
        action: "ASSISTANT_RESERVATION_FULFILL",
        entityType: "Reservation",
        entityId: reservation.id,
        summary: `Servida la reserva de «${reservation.book.title}» desde Aran`,
        userId: user.userId,
      });
      const texts = NOTIFICATION_TEXTS.reservation({
        name: reservation.reader.fullName,
        title: reservation.book.title,
      });
      await notifyReader({
        reader: {
          id: reservation.reader.id,
          fullName: reservation.reader.fullName,
          email: reservation.reader.email,
        },
        kind: "reservation",
        subject: texts.subject,
        body: texts.body,
      });
      return {
        message: `Préstamo creado para ${reservation.reader.fullName}.`,
        bookIds: [reservation.bookId],
      };
    },
  },
  {
    type: "staff.create_book",
    scope: "STAFF",
    risk: "medium",
    schema: z.object({
      title: z.string().trim().min(1).max(220),
      author: z.string().trim().min(1).max(180),
      category: z.enum(CATEGORIES),
      isbn: optionalText(32),
      publisher: optionalText(160),
      year: z.number().int().min(1000).max(2200).optional(),
      language: z.enum(LANGUAGES).optional(),
      pages: z.number().int().min(1).max(100000).optional(),
      copies: z.number().int().min(1).max(9999).optional(),
      location: optionalText(60),
      recordNumber: optionalText(40),
      cdu: optionalText(40),
      coverUrl: optionalText(500),
      description: optionalText(2000),
      tags: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
    }),
    async describe(payload) {
      return `Añadir al catálogo «${payload.title}» de ${payload.author}.`;
    },
    async execute(payload, actor) {
      const user = staffOf(actor);
      const book = await prisma.book.create({
        data: {
          title: payload.title,
          author: payload.author,
          category: payload.category,
          isbn: payload.isbn ?? null,
          publisher: payload.publisher ?? null,
          year: payload.year ?? null,
          language: payload.language ?? "Español",
          pages: payload.pages ?? null,
          copies: payload.copies ?? 1,
          location: payload.location ?? null,
          recordNumber: payload.recordNumber ?? null,
          cdu: payload.cdu ?? null,
          coverUrl: payload.coverUrl ?? null,
          description: payload.description ?? null,
          tags: payload.tags ?? [],
          createdById: user.userId,
          updatedById: user.userId,
        },
      });
      await recordAudit({
        action: "ASSISTANT_BOOK_CREATE",
        entityType: "Book",
        entityId: book.id,
        summary: `Añadido «${book.title}» de ${book.author} desde Aran`,
        userId: user.userId,
      });
      return {
        message: `«${book.title}» añadido al catálogo.`,
        bookIds: [book.id],
      };
    },
  },
  {
    type: "staff.update_book",
    scope: "STAFF",
    risk: "medium",
    schema: z.object({
      bookId: id,
      title: z.string().trim().min(1).max(220).optional(),
      author: z.string().trim().min(1).max(180).optional(),
      category: z.enum(CATEGORIES).optional(),
      isbn: optionalText(32),
      publisher: optionalText(160),
      year: z.number().int().min(1000).max(2200).optional(),
      language: z.enum(LANGUAGES).optional(),
      pages: z.number().int().min(1).max(100000).optional(),
      copies: z.number().int().min(1).max(9999).optional(),
      location: optionalText(60),
      recordNumber: optionalText(40),
      cdu: optionalText(40),
      coverUrl: optionalText(500),
      description: optionalText(2000),
      tags: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
    }),
    async describe(payload) {
      const book = await bookOrThrow(payload.bookId);
      const fields = Object.keys(payload).filter((key) => key !== "bookId");
      return `Editar «${book.title}» (${fields.length} campo(s)).`;
    },
    async execute(payload, actor) {
      const user = staffOf(actor);
      const book = await bookOrThrow(payload.bookId);
      const { bookId, ...data } = payload;
      await prisma.book.update({
        where: { id: bookId },
        data: {
          ...data,
          updatedById: user.userId,
        },
      });
      await recordAudit({
        action: "ASSISTANT_BOOK_UPDATE",
        entityType: "Book",
        entityId: bookId,
        summary: `Editado «${book.title}» desde Aran`,
        userId: user.userId,
      });
      return {
        message: `«${book.title}» actualizado.`,
        bookIds: [bookId],
      };
    },
  },
  {
    type: "staff.create_reader",
    scope: "STAFF",
    risk: "medium",
    schema: z.object({
      fullName: z.string().trim().min(2).max(120),
      cardNumber: optionalText(32),
      groupName: optionalText(60),
      email: z.string().trim().email().max(160).optional(),
      phone: optionalText(30),
      notes: optionalText(500),
    }),
    async describe(payload) {
      return `Dar de alta a ${payload.fullName}.`;
    },
    async execute(payload, actor) {
      const user = staffOf(actor);
      let cardNumber = payload.cardNumber?.trim() || null;
      if (!cardNumber) {
        const existing = await prisma.reader.findMany({
          where: { cardNumber: { not: null } },
          select: { cardNumber: true },
        });
        cardNumber = nextCardNumber(existing.map((row) => row.cardNumber));
      }
      const reader = await prisma.reader.create({
        data: {
          fullName: payload.fullName,
          cardNumber,
          groupName: payload.groupName ?? null,
          email: payload.email ?? null,
          phone: payload.phone ?? null,
          notes: payload.notes ?? null,
        },
      });
      await recordAudit({
        action: "ASSISTANT_READER_CREATE",
        entityType: "Reader",
        entityId: reader.id,
        summary: `Alta de «${reader.fullName}» desde Aran`,
        userId: user.userId,
      });
      return {
        message: `Alta creada para ${reader.fullName}${
          cardNumber ? ` con el carné ${cardNumber}` : ""
        }.`,
      };
    },
  },
  {
    type: "staff.update_reader",
    scope: "STAFF",
    risk: "medium",
    schema: z.object({
      readerId: id,
      fullName: z.string().trim().min(2).max(120).optional(),
      cardNumber: optionalText(32),
      groupName: optionalText(60),
      email: z.string().trim().email().max(160).optional(),
      phone: optionalText(30),
      notes: optionalText(500),
    }),
    async describe(payload) {
      const reader = await readerOrThrow(payload.readerId);
      return `Editar la ficha de ${reader.fullName}.`;
    },
    async execute(payload, actor) {
      const user = staffOf(actor);
      const reader = await readerOrThrow(payload.readerId);
      const { readerId, ...data } = payload;
      await prisma.reader.update({
        where: { id: readerId },
        data: {
          ...data,
          cardNumber: data.cardNumber?.trim() || undefined,
        },
      });
      await recordAudit({
        action: "ASSISTANT_READER_UPDATE",
        entityType: "Reader",
        entityId: readerId,
        summary: `Editada la ficha de «${reader.fullName}» desde Aran`,
        userId: user.userId,
      });
      return { message: `Ficha de ${reader.fullName} actualizada.` };
    },
  },
  {
    type: "staff.set_reader_active",
    scope: "STAFF",
    risk: "high",
    schema: z.object({ readerId: id, active: z.boolean() }),
    async describe(payload) {
      const reader = await readerOrThrow(payload.readerId);
      return `${payload.active ? "Activar" : "Desactivar"} a ${reader.fullName}.`;
    },
    async execute(payload, actor) {
      const user = staffOf(actor);
      const reader = await readerOrThrow(payload.readerId);
      await prisma.reader.update({
        where: { id: reader.id },
        data: { active: payload.active },
      });
      if (!payload.active) await revokeReaderSessions(reader.id);
      await recordAudit({
        action: payload.active ? "ASSISTANT_READER_ACTIVATE" : "ASSISTANT_READER_DEACTIVATE",
        entityType: "Reader",
        entityId: reader.id,
        summary: `${payload.active ? "Activado" : "Desactivado"} «${reader.fullName}» desde Aran`,
        userId: user.userId,
      });
      return {
        message: `${reader.fullName} ${payload.active ? "activado" : "desactivado"}.`,
      };
    },
  },
  {
    type: "staff.suspend_reader",
    scope: "STAFF",
    risk: "high",
    schema: z
      .object({
        readerId: id,
        permanent: z.boolean().optional(),
        amount: z.number().int().min(1).max(999999).optional(),
        unit: z.enum(["minutos", "horas", "dias", "semanas", "meses"]).optional(),
        reason: optionalText(200),
      })
      .refine(
        (value) =>
          value.permanent === true ||
          (typeof value.amount === "number" && Boolean(value.unit)),
        { message: "Indica la duración o marca la suspensión como permanente." },
      ),
    async describe(payload) {
      const reader = await readerOrThrow(payload.readerId);
      return payload.permanent
        ? `Suspender el préstamo a ${reader.fullName} de forma permanente.`
        : `Suspender el préstamo a ${reader.fullName} durante ${payload.amount} ${payload.unit}.`;
    },
    async execute(payload, actor) {
      const user = staffOf(actor);
      const reader = await readerOrThrow(payload.readerId);
      const suspendedUntil = payload.permanent
        ? PERMANENT_SUSPENSION_DATE
        : addSuspensionDuration(
            new Date(),
            payload.amount as number,
            payload.unit as "minutos" | "horas" | "dias" | "semanas" | "meses",
          );
      await prisma.reader.update({
        where: { id: reader.id },
        data: {
          suspendedUntil,
          suspensionReason: payload.reason ?? null,
        },
      });
      await recordAudit({
        action: "ASSISTANT_READER_SUSPEND",
        entityType: "Reader",
        entityId: reader.id,
        summary: `Suspensión de «${reader.fullName}» desde Aran`,
        userId: user.userId,
      });
      const texts = NOTIFICATION_TEXTS.suspension({
        name: reader.fullName,
        until: suspendedUntil,
        reason: payload.reason ?? null,
      });
      await notifyReader({
        reader: { id: reader.id, fullName: reader.fullName, email: reader.email },
        kind: "suspension",
        subject: texts.subject,
        body: texts.body,
      });
      return {
        message: payload.permanent
          ? `${reader.fullName} queda suspendido de forma permanente.`
          : `${reader.fullName} queda suspendido hasta el ${iso(suspendedUntil)}.`,
      };
    },
  },
  {
    type: "staff.lift_suspension",
    scope: "STAFF",
    risk: "high",
    schema: z.object({ readerId: id }),
    async describe(payload) {
      const reader = await readerOrThrow(payload.readerId);
      return `Levantar la suspensión de ${reader.fullName}.`;
    },
    async execute(payload, actor) {
      const user = staffOf(actor);
      const reader = await readerOrThrow(payload.readerId);
      await prisma.reader.update({
        where: { id: reader.id },
        data: { suspendedUntil: null, suspensionReason: null },
      });
      await recordAudit({
        action: "ASSISTANT_READER_SUSPEND_LIFT",
        entityType: "Reader",
        entityId: reader.id,
        summary: `Levantada la suspensión de «${reader.fullName}» desde Aran`,
        userId: user.userId,
      });
      return { message: `Suspensión de ${reader.fullName} levantada.` };
    },
  },
  {
    type: "staff.reset_pin",
    scope: "STAFF",
    risk: "high",
    schema: z.object({ readerId: id }),
    async describe(payload) {
      const reader = await readerOrThrow(payload.readerId);
      return `Restablecer el PIN de «Mi biblioteca» de ${reader.fullName}.`;
    },
    async execute(payload, actor) {
      const user = staffOf(actor);
      const reader = await readerOrThrow(payload.readerId);
      await prisma.reader.update({
        where: { id: reader.id },
        data: { pinHash: null, pinMustChange: true },
      });
      await revokeReaderSessions(reader.id);
      await recordAudit({
        action: "ASSISTANT_READER_PIN_RESET",
        entityType: "Reader",
        entityId: reader.id,
        summary: `Restablecido el PIN de «${reader.fullName}» desde Aran`,
        userId: user.userId,
      });
      return {
        message: `PIN de ${reader.fullName} restablecido al PIN inicial.`,
      };
    },
  },
  {
    type: "staff.approve_suggestion",
    scope: "STAFF",
    risk: "medium",
    schema: z.object({
      suggestionId: id,
      category: z.enum(CATEGORIES).optional(),
      copies: z.number().int().min(1).max(9999).optional(),
      notes: optionalText(500),
    }),
    async describe(payload) {
      const suggestion = await prisma.purchaseSuggestion.findUnique({
        where: { id: payload.suggestionId },
      });
      if (!suggestion) throw new ActionError("Esa solicitud ya no existe.");
      return `Aprobar la solicitud de «${suggestion.title}» e incorporarla al catálogo.`;
    },
    async execute(payload, actor) {
      const user = staffOf(actor);
      const suggestion = await prisma.purchaseSuggestion.findUnique({
        where: { id: payload.suggestionId },
      });
      if (!suggestion) throw new ActionError("Esa solicitud ya no existe.");
      if (suggestion.status !== "PENDING") {
        throw new ActionError("Esa solicitud ya está resuelta.");
      }
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
              category: payload.category ?? "Referencia",
              copies: payload.copies ?? 1,
              createdById: user.userId,
              updatedById: user.userId,
            },
          });
      if (!book) throw new ActionError("No se ha podido crear el libro.");
      await prisma.purchaseSuggestion.update({
        where: { id: suggestion.id },
        data: {
          status: "APPROVED",
          bookId: book.id,
          notes: payload.notes ?? null,
          resolvedAt: new Date(),
        },
      });
      await recordAudit({
        action: "ASSISTANT_PURCHASE_SUGGESTION_APPROVE",
        entityType: "PurchaseSuggestion",
        entityId: suggestion.id,
        summary: `Aprobada la solicitud de «${suggestion.title}» desde Aran`,
        userId: user.userId,
      });
      return {
        message: duplicate
          ? `Solicitud aprobada; el título ya estaba en el catálogo.`
          : `«${book.title}» incorporado al catálogo.`,
        bookIds: [book.id],
      };
    },
  },
  {
    type: "staff.reject_suggestion",
    scope: "STAFF",
    risk: "medium",
    schema: z.object({
      suggestionId: id,
      notes: optionalText(500),
    }),
    async describe(payload) {
      const suggestion = await prisma.purchaseSuggestion.findUnique({
        where: { id: payload.suggestionId },
      });
      if (!suggestion) throw new ActionError("Esa solicitud ya no existe.");
      return `Descartar la solicitud de «${suggestion.title}».`;
    },
    async execute(payload, actor) {
      const user = staffOf(actor);
      const suggestion = await prisma.purchaseSuggestion.findUnique({
        where: { id: payload.suggestionId },
      });
      if (!suggestion) throw new ActionError("Esa solicitud ya no existe.");
      if (suggestion.status !== "PENDING") {
        throw new ActionError("Esa solicitud ya está resuelta.");
      }
      await prisma.purchaseSuggestion.update({
        where: { id: suggestion.id },
        data: {
          status: "REJECTED",
          notes: payload.notes ?? null,
          resolvedAt: new Date(),
        },
      });
      await recordAudit({
        action: "ASSISTANT_PURCHASE_SUGGESTION_REJECT",
        entityType: "PurchaseSuggestion",
        entityId: suggestion.id,
        summary: `Descartada la solicitud de «${suggestion.title}» desde Aran`,
        userId: user.userId,
      });
      return { message: "Solicitud descartada." };
    },
  },
  {
    type: "staff.notify_reader",
    scope: "STAFF",
    risk: "medium",
    schema: z.object({
      readerId: id,
      subject: z.string().trim().min(1).max(160),
      body: z.string().trim().min(1).max(3000),
      kind: z.enum(["loan", "reservation", "overdue", "suspension"]).optional(),
    }),
    async describe(payload) {
      const reader = await readerOrThrow(payload.readerId);
      return `Enviar un aviso a ${reader.fullName}: «${payload.subject}».`;
    },
    async execute(payload, actor) {
      const user = staffOf(actor);
      const reader = await readerOrThrow(payload.readerId);
      await notifyReader({
        reader: { id: reader.id, fullName: reader.fullName, email: reader.email },
        kind: payload.kind ?? "loan",
        subject: payload.subject,
        body: payload.body,
      });
      await recordAudit({
        action: "ASSISTANT_NOTIFICATION_SEND",
        entityType: "Notification",
        entityId: reader.id,
        summary: `Aviso «${payload.subject}» enviado a «${reader.fullName}» desde Aran`,
        userId: user.userId,
      });
      return { message: `Aviso enviado a ${reader.fullName}.` };
    },
  },
  {
    type: "staff.set_review_approved",
    scope: "STAFF",
    risk: "medium",
    schema: z.object({ reviewId: id, approved: z.boolean() }),
    async describe(payload) {
      const review = await prisma.review.findUnique({
        where: { id: payload.reviewId },
        include: { book: true },
      });
      if (!review) throw new ActionError("Esa reseña ya no existe.");
      return `${payload.approved ? "Aprobar" : "Ocultar"} la reseña de «${review.book.title}».`;
    },
    async execute(payload, actor) {
      const user = staffOf(actor);
      const review = await prisma.review.findUnique({
        where: { id: payload.reviewId },
        include: { book: true },
      });
      if (!review) throw new ActionError("Esa reseña ya no existe.");
      await prisma.review.update({
        where: { id: review.id },
        data: { approved: payload.approved },
      });
      await recordAudit({
        action: "ASSISTANT_REVIEW_MODERATE",
        entityType: "Review",
        entityId: review.id,
        summary: `Reseña de «${review.book.title}» ${
          payload.approved ? "aprobada" : "ocultada"
        } desde Aran`,
        userId: user.userId,
      });
      return {
        message: `Reseña ${payload.approved ? "aprobada" : "ocultada"}.`,
        bookIds: [review.bookId],
      };
    },
  },
  {
    type: "staff.create_collection",
    scope: "STAFF",
    risk: "medium",
    schema: z.object({
      name: z.string().trim().min(1).max(80),
      description: optionalText(500),
      position: z.number().int().min(0).max(999).optional(),
    }),
    async describe(payload) {
      return `Crear la lista pública «${payload.name}».`;
    },
    async execute(payload, actor) {
      const user = staffOf(actor);
      const collection = await prisma.collection.create({
        data: {
          name: payload.name,
          description: payload.description ?? null,
          position: payload.position ?? 0,
          slug: await uniqueCollectionSlug(payload.name),
          createdById: user.userId,
        },
      });
      await recordAudit({
        action: "ASSISTANT_COLLECTION_CREATE",
        entityType: "Collection",
        entityId: collection.id,
        summary: `Creada la lista «${collection.name}» desde Aran`,
        userId: user.userId,
      });
      return { message: `Lista «${collection.name}» creada.` };
    },
  },
  {
    type: "staff.update_collection",
    scope: "STAFF",
    risk: "medium",
    schema: z.object({
      collectionId: id,
      name: z.string().trim().min(1).max(80).optional(),
      description: optionalText(500),
      position: z.number().int().min(0).max(999).optional(),
    }),
    async describe(payload) {
      const collection = await prisma.collection.findUnique({
        where: { id: payload.collectionId },
      });
      if (!collection || collection.ownerReaderId) {
        throw new ActionError("Esa lista no existe o es privada.");
      }
      return `Editar la lista «${collection.name}».`;
    },
    async execute(payload, actor) {
      const user = staffOf(actor);
      const collection = await prisma.collection.findUnique({
        where: { id: payload.collectionId },
      });
      if (!collection || collection.ownerReaderId) {
        throw new ActionError("Esa lista no existe o es privada.");
      }
      const { collectionId, ...data } = payload;
      await prisma.collection.update({
        where: { id: collectionId },
        data: {
          ...data,
          slug: data.name
            ? await uniqueCollectionSlug(data.name)
            : undefined,
        },
      });
      await recordAudit({
        action: "ASSISTANT_COLLECTION_UPDATE",
        entityType: "Collection",
        entityId: collectionId,
        summary: `Editada la lista «${collection.name}» desde Aran`,
        userId: user.userId,
      });
      return { message: `Lista «${collection.name}» actualizada.` };
    },
  },
  {
    type: "staff.add_book_to_collection",
    scope: "STAFF",
    risk: "medium",
    schema: z.object({
      collectionId: id,
      bookId: id,
      position: z.number().int().min(0).max(999).optional(),
    }),
    async describe(payload) {
      const [collection, book] = await Promise.all([
        prisma.collection.findUnique({ where: { id: payload.collectionId } }),
        bookOrThrow(payload.bookId),
      ]);
      if (!collection || collection.ownerReaderId) {
        throw new ActionError("Esa lista no existe o es privada.");
      }
      return `Añadir «${book.title}» a la lista «${collection.name}».`;
    },
    async execute(payload, actor) {
      const user = staffOf(actor);
      const [collection, book] = await Promise.all([
        prisma.collection.findUnique({ where: { id: payload.collectionId } }),
        bookOrThrow(payload.bookId),
      ]);
      if (!collection || collection.ownerReaderId) {
        throw new ActionError("Esa lista no existe o es privada.");
      }
      const last = await prisma.bookCollection.findFirst({
        where: { collectionId: collection.id },
        orderBy: { position: "desc" },
        select: { position: true },
      });
      await prisma.bookCollection.upsert({
        where: {
          bookId_collectionId: {
            bookId: book.id,
            collectionId: collection.id,
          },
        },
        create: {
          bookId: book.id,
          collectionId: collection.id,
          position: payload.position ?? (last?.position ?? 0) + 1,
        },
        update: { position: payload.position ?? undefined },
      });
      await recordAudit({
        action: "ASSISTANT_COLLECTION_ADD_BOOK",
        entityType: "Collection",
        entityId: collection.id,
        summary: `Añadido «${book.title}» a «${collection.name}» desde Aran`,
        userId: user.userId,
      });
      return {
        message: `«${book.title}» añadido a «${collection.name}».`,
        bookIds: [book.id],
      };
    },
  },
  {
    type: "staff.remove_book_from_collection",
    scope: "STAFF",
    risk: "medium",
    schema: z.object({ collectionId: id, bookId: id }),
    async describe(payload) {
      const [collection, book] = await Promise.all([
        prisma.collection.findUnique({ where: { id: payload.collectionId } }),
        bookOrThrow(payload.bookId),
      ]);
      if (!collection || collection.ownerReaderId) {
        throw new ActionError("Esa lista no existe o es privada.");
      }
      return `Quitar «${book.title}» de la lista «${collection.name}».`;
    },
    async execute(payload, actor) {
      const user = staffOf(actor);
      const collection = await prisma.collection.findUnique({
        where: { id: payload.collectionId },
      });
      if (!collection || collection.ownerReaderId) {
        throw new ActionError("Esa lista no existe o es privada.");
      }
      await prisma.bookCollection.deleteMany({
        where: { collectionId: collection.id, bookId: payload.bookId },
      });
      await recordAudit({
        action: "ASSISTANT_COLLECTION_REMOVE_BOOK",
        entityType: "Collection",
        entityId: collection.id,
        summary: `Libro quitado de «${collection.name}» desde Aran`,
        userId: user.userId,
      });
      return { message: `Libro quitado de «${collection.name}».` };
    },
  },
  {
    type: "staff.publish_changelog",
    scope: "STAFF",
    managerOnly: true,
    risk: "high",
    schema: z.object({
      title: z.string().trim().min(1).max(160),
      body: z.string().trim().min(1).max(8000),
    }),
    async describe(payload) {
      return `Publicar la novedad «${payload.title}» para todo el personal.`;
    },
    async execute(payload, actor) {
      const user = managerOf(actor);
      const changelog = await prisma.changelog.create({
        data: {
          title: payload.title,
          body: payload.body,
          createdById: user.userId,
        },
      });
      await recordAudit({
        action: "ASSISTANT_CHANGELOG_CREATE",
        entityType: "Changelog",
        entityId: changelog.id,
        summary: `Publicada la novedad «${changelog.title}» desde Aran`,
        userId: user.userId,
      });
      return { message: `Novedad «${changelog.title}» publicada.` };
    },
  },
  {
    type: "staff.create_user",
    scope: "STAFF",
    managerOnly: true,
    risk: "high",
    schema: z.object({
      username: z
        .string()
        .trim()
        .min(3)
        .max(32)
        .regex(/^[a-zA-Z0-9._-]+$/),
      displayName: z.string().trim().min(2).max(120),
      role: z.enum(["EDITOR", "ADMIN"]),
    }),
    async describe(payload) {
      return `Crear la cuenta de personal «${payload.username}» (${payload.displayName}) con rol ${payload.role}.`;
    },
    async execute(payload, actor) {
      const user = managerOf(actor);
      const password = temporaryPassword();
      const created = await prisma.user.create({
        data: {
          username: payload.username,
          displayName: payload.displayName,
          role: payload.role,
          passwordHash: await hashPassword(password),
          mustChangePassword: true,
          createdById: user.userId,
        },
      });
      await recordAudit({
        action: "ASSISTANT_USER_CREATE",
        entityType: "User",
        entityId: created.id,
        summary: `Creada la cuenta «${created.username}» desde Aran`,
        userId: user.userId,
      });
      return {
        message: `Cuenta «${created.username}» creada. Contraseña temporal: ${password} (se pedirá cambiarla al entrar).`,
      };
    },
  },
  {
    type: "staff.set_user_active",
    scope: "STAFF",
    managerOnly: true,
    risk: "high",
    schema: z.object({ userId: id, active: z.boolean() }),
    async describe(payload) {
      const target = await prisma.user.findUnique({
        where: { id: payload.userId },
      });
      if (!target) throw new ActionError("Esa cuenta ya no existe.");
      return `${payload.active ? "Activar" : "Desactivar"} la cuenta «${target.username}».`;
    },
    async execute(payload, actor) {
      const user = managerOf(actor);
      const target = await prisma.user.findUnique({
        where: { id: payload.userId },
      });
      if (!target) throw new ActionError("Esa cuenta ya no existe.");
      if (!payload.active) {
        if (target.id === user.userId) {
          throw new ActionError("No puedes desactivar tu propia cuenta.");
        }
        const owners = await prisma.user.count({
          where: { role: "OWNER", active: true },
        });
        if (target.role === "OWNER" && owners <= 1) {
          throw new ActionError("No se puede desactivar la última cuenta de dueño.");
        }
      }
      await prisma.user.update({
        where: { id: target.id },
        data: { active: payload.active },
      });
      await recordAudit({
        action: payload.active ? "ASSISTANT_USER_ACTIVATE" : "ASSISTANT_USER_DEACTIVATE",
        entityType: "User",
        entityId: target.id,
        summary: `${payload.active ? "Activada" : "Desactivada"} la cuenta «${target.username}» desde Aran`,
        userId: user.userId,
      });
      return {
        message: `Cuenta «${target.username}» ${payload.active ? "activada" : "desactivada"}.`,
      };
    },
  },
  {
    type: "staff.set_user_role",
    scope: "STAFF",
    managerOnly: true,
    risk: "high",
    schema: z.object({
      userId: id,
      role: z.enum(["EDITOR", "ADMIN", "OWNER"]),
    }),
    async describe(payload) {
      const target = await prisma.user.findUnique({
        where: { id: payload.userId },
      });
      if (!target) throw new ActionError("Esa cuenta ya no existe.");
      return `Cambiar el rol de «${target.username}» a ${payload.role}.`;
    },
    async execute(payload, actor) {
      const user = managerOf(actor);
      const target = await prisma.user.findUnique({
        where: { id: payload.userId },
      });
      if (!target) throw new ActionError("Esa cuenta ya no existe.");
      if (payload.role === "OWNER" && user.role !== "OWNER") {
        throw new ActionError("Solo el dueño puede nombrar a otro dueño.");
      }
      if (target.role === "OWNER" && payload.role !== "OWNER") {
        const owners = await prisma.user.count({
          where: { role: "OWNER", active: true },
        });
        if (owners <= 1) {
          throw new ActionError("No se puede quitar el rol a la última cuenta de dueño.");
        }
      }
      await prisma.user.update({
        where: { id: target.id },
        data: { role: payload.role },
      });
      await recordAudit({
        action: "ASSISTANT_USER_ROLE",
        entityType: "User",
        entityId: target.id,
        summary: `Rol de «${target.username}» cambiado a ${payload.role} desde Aran`,
        userId: user.userId,
      });
      return { message: `Rol de «${target.username}» actualizado a ${payload.role}.` };
    },
  },
  {
    type: "staff.reset_user_password",
    scope: "STAFF",
    managerOnly: true,
    risk: "high",
    schema: z.object({ userId: id }),
    async describe(payload) {
      const target = await prisma.user.findUnique({
        where: { id: payload.userId },
      });
      if (!target) throw new ActionError("Esa cuenta ya no existe.");
      return `Restablecer la contraseña de «${target.username}».`;
    },
    async execute(payload, actor) {
      const user = managerOf(actor);
      const target = await prisma.user.findUnique({
        where: { id: payload.userId },
      });
      if (!target) throw new ActionError("Esa cuenta ya no existe.");
      const password = temporaryPassword();
      await prisma.user.update({
        where: { id: target.id },
        data: {
          passwordHash: await hashPassword(password),
          mustChangePassword: true,
        },
      });
      await prisma.session.deleteMany({ where: { userId: target.id } });
      await recordAudit({
        action: "ASSISTANT_USER_PASSWORD_RESET",
        entityType: "User",
        entityId: target.id,
        summary: `Contraseña de «${target.username}» restablecida desde Aran`,
        userId: user.userId,
      });
      return {
        message: `Contraseña de «${target.username}» restablecida. Temporal: ${password}`,
      };
    },
  },
];

const BY_TYPE = new Map(definitions.map((definition) => [definition.type, definition]));

export function isAllowedAction(type: string, actor: AssistantActor): boolean {
  const definition = BY_TYPE.get(type);
  if (!definition) return false;
  if (definition.scope !== actor.scope) return false;
  if (definition.managerOnly) {
    if (actor.scope !== "STAFF" || !isManagerRole(actor.role)) return false;
  }
  return true;
}

export function actionDefinitionsFor(actor: AssistantActor): ActionDefinition[] {
  return definitions.filter((definition) => isAllowedAction(definition.type, actor));
}

export function actionCatalogForPrompt(actor: AssistantActor): string {
  return actionDefinitionsFor(actor)
    .map(
      (definition) =>
        `- ${definition.type} (${definition.risk === "high" ? "riesgo alto" : "riesgo medio"})`,
    )
    .join("\n");
}

/** Valida el payload y guarda la acción pendiente. */
export async function proposeAction(input: {
  actor: AssistantActor;
  conversationId: string | null;
  type: string;
  payload: unknown;
}): Promise<ProposedActionView> {
  const { actor, conversationId, type } = input;
  if (!isAllowedAction(type, actor)) {
    throw new ActionError("No tienes permiso para proponer esa acción.");
  }
  const definition = BY_TYPE.get(type)!;
  const parsed = definition.schema.safeParse(input.payload ?? {});
  if (!parsed.success) {
    throw new ActionError(
      `Faltan datos para la acción: ${parsed.error.issues
        .map((issue) => issue.path.join(".") || issue.message)
        .join(", ")}`,
    );
  }
  const summary = await definition.describe(parsed.data, actor);
  const expiresAt = new Date(Date.now() + ACTION_TTL_MINUTES * 60 * 1000);
  const action = await prisma.assistantAction.create({
    data: {
      conversationId,
      scope: actor.scope,
      userId: actor.scope === "STAFF" ? actor.userId : null,
      readerId: actor.scope === "READER" ? actor.readerId : null,
      type,
      payload: parsed.data as Prisma.InputJsonValue,
      summary,
      expiresAt,
    },
  });
  return {
    id: action.id,
    type,
    summary,
    risk: definition.risk,
    expiresAt: expiresAt.toISOString(),
    payload: parsed.data as Record<string, unknown>,
  };
}

/** Confirma y ejecuta una acción pendiente. */
export async function executeAction(input: {
  actor: AssistantActor;
  actionId: string;
}): Promise<{ message: string; bookIds: string[] }> {
  const { actor, actionId } = input;
  const action = await prisma.assistantAction.findUnique({
    where: { id: actionId },
  });
  if (!action) throw new ActionError("Esa acción ya no existe.");
  if (action.status !== "PENDING") {
    throw new ActionError("Esa acción ya se ha resuelto.");
  }
  if (action.expiresAt.getTime() <= Date.now()) {
    await prisma.assistantAction.update({
      where: { id: action.id },
      data: { status: "EXPIRED" },
    });
    throw new ActionError("La acción ha caducado. Vuelve a pedírsela a Aran.");
  }
  const sameActor =
    action.scope === actor.scope &&
    ((actor.scope === "READER" && action.readerId === actor.readerId) ||
      (actor.scope === "STAFF" && action.userId === actor.userId));
  if (!sameActor || !isAllowedAction(action.type, actor)) {
    throw new ActionError("No puedes confirmar esa acción.");
  }
  const definition = BY_TYPE.get(action.type)!;
  const parsed = definition.schema.safeParse(action.payload);
  if (!parsed.success) {
    await prisma.assistantAction.update({
      where: { id: action.id },
      data: { status: "FAILED", error: "invalid-payload" },
    });
    throw new ActionError("Los datos de la acción no son válidos.");
  }
  // Reclamo atómico: si dos pestañas confirman a la vez, solo una ejecuta.
  const claimed = await prisma.assistantAction.updateMany({
    where: { id: action.id, status: "PENDING" },
    data: { status: "EXECUTED", executedAt: new Date() },
  });
  if (claimed.count === 0) {
    throw new ActionError("Esa acción ya se ha resuelto.");
  }
  try {
    const result = await definition.execute(parsed.data, actor);
    revalidateAll();
    for (const bookId of result.bookIds ?? []) {
      revalidatePath(`/libro/${bookId}`);
    }
    return { message: result.message, bookIds: result.bookIds ?? [] };
  } catch (error) {
    await prisma.assistantAction
      .update({
        where: { id: action.id },
        data: {
          status: "FAILED",
          error: error instanceof Error ? error.message.slice(0, 500) : "error",
        },
      })
      .catch(() => undefined);
    throw error;
  }
}

export async function cancelAction(input: {
  actor: AssistantActor;
  actionId: string;
}): Promise<void> {
  const action = await prisma.assistantAction.findUnique({
    where: { id: input.actionId },
  });
  if (!action) return;
  const sameActor =
    action.scope === input.actor.scope &&
    ((input.actor.scope === "READER" &&
      action.readerId === input.actor.readerId) ||
      (input.actor.scope === "STAFF" && action.userId === input.actor.userId));
  if (!sameActor) throw new ActionError("No puedes cancelar esa acción.");
  if (action.status === "PENDING") {
    await prisma.assistantAction.update({
      where: { id: action.id },
      data: { status: "CANCELLED" },
    });
  }
}
