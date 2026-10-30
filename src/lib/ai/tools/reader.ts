import "server-only";

import { z } from "zod";

import { READER_MAX_RENEWALS } from "../../constants";
import { prisma } from "../../prisma";
import type { AssistantTool } from "../types";
import { isoDate, toAssistantBook, clip, availabilityFor } from "./helpers";

function daysBetween(from: Date, to: Date): number {
  return Math.ceil((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
}

/** Herramientas personales. Todas reciben el lector del servidor, nunca del modelo. */
export function readerTools(readerId: string): AssistantTool[] {
  return [
    {
      name: "mis_prestamos",
      description:
        "Lista los préstamos activos de la persona lectora, con fechas de devolución, retrasos y prórrogas usadas.",
      parameters: z.object({}),
      async execute() {
        const loans = await prisma.loan.findMany({
          where: { readerId, returnedAt: null },
          include: { book: true },
          orderBy: { dueAt: "asc" },
        });
        const now = new Date();
        return {
          result: {
            maxRenewals: READER_MAX_RENEWALS,
            loans: loans.map((loan) => ({
              loanId: loan.id,
              bookId: loan.bookId,
              title: loan.book.title,
              author: loan.book.author,
              dueAt: isoDate(loan.dueAt),
              daysLeft: daysBetween(now, loan.dueAt),
              overdue: loan.dueAt.getTime() < now.getTime(),
              renewals: loan.renewals,
              canRenew: loan.renewals < READER_MAX_RENEWALS,
            })),
          },
          books: loans.map((loan) => toAssistantBook(loan.book)),
        };
      },
    },
    {
      name: "mis_reservas",
      description:
        "Lista las reservas activas de la persona lectora, con el libro, la fecha y la posición en la cola.",
      parameters: z.object({}),
      async execute() {
        const reservations = await prisma.reservation.findMany({
          where: { readerId, status: "ACTIVE" },
          include: { book: true },
          orderBy: { createdAt: "asc" },
        });
        const positions = await Promise.all(
          reservations.map(async (reservation) => {
            const ahead = await prisma.reservation.count({
              where: {
                bookId: reservation.bookId,
                status: "ACTIVE",
                createdAt: { lt: reservation.createdAt },
              },
            });
            return ahead + 1;
          }),
        );
        return {
          result: reservations.map((reservation, index) => ({
            reservationId: reservation.id,
            bookId: reservation.bookId,
            title: reservation.book.title,
            author: reservation.book.author,
            reservedAt: isoDate(reservation.createdAt),
            position: positions[index],
          })),
          books: reservations.map((reservation) =>
            toAssistantBook(reservation.book),
          ),
        };
      },
    },
    {
      name: "mis_avisos",
      description:
        "Devuelve los avisos de la bandeja de «Mi biblioteca»: tipo, asunto, fecha y si están leídos. No incluye datos de otras personas.",
      parameters: z.object({
        limit: z.number().int().min(1).max(30).optional(),
      }),
      async execute(args) {
        const take = Math.min(Number(args.limit) || 10, 30);
        const [notifications, unread] = await Promise.all([
          prisma.notification.findMany({
            where: { readerId },
            orderBy: { createdAt: "desc" },
            take,
            select: {
              id: true,
              kind: true,
              subject: true,
              readAt: true,
              createdAt: true,
              sentAt: true,
            },
          }),
          prisma.notification.count({ where: { readerId, readAt: null } }),
        ]);
        return {
          result: {
            unread,
            notifications: notifications.map((notification) => ({
              notificationId: notification.id,
              kind: notification.kind,
              subject: notification.subject,
              date: isoDate(notification.createdAt),
              read: Boolean(notification.readAt),
              emailed: Boolean(notification.sentAt),
            })),
          },
        };
      },
    },
    {
      name: "mis_listas",
      description:
        "Lista las listas de lectura privadas de la persona lectora y los libros que contienen.",
      parameters: z.object({}),
      async execute() {
        const collections = await prisma.collection.findMany({
          where: { ownerReaderId: readerId },
          include: {
            books: {
              include: { book: true },
              orderBy: { position: "asc" },
            },
          },
          orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        });
        return {
          result: collections.map((collection) => ({
            collectionId: collection.id,
            name: collection.name,
            description: collection.description,
            books: collection.books.map((entry) => ({
              bookId: entry.bookId,
              title: entry.book.title,
              author: entry.book.author,
            })),
          })),
          books: collections.flatMap((collection) =>
            collection.books.map((entry) => toAssistantBook(entry.book)),
          ),
        };
      },
    },
    {
      name: "mi_historial",
      description:
        "Historial de préstamos ya devueltos de la persona lectora, con fechas y valoraciones.",
      parameters: z.object({
        limit: z.number().int().min(1).max(30).optional(),
      }),
      async execute(args) {
        const take = Math.min(Number(args.limit) || 10, 30);
        const loans = await prisma.loan.findMany({
          where: { readerId, returnedAt: { not: null } },
          include: {
            book: {
              include: {
                reviews: {
                  where: { readerId },
                  select: { rating: true, comment: true },
                },
              },
            },
          },
          orderBy: { returnedAt: "desc" },
          take,
        });
        return {
          result: loans.map((loan) => ({
            loanId: loan.id,
            bookId: loan.bookId,
            title: loan.book.title,
            author: loan.book.author,
            category: loan.book.category,
            loanedAt: isoDate(loan.loanedAt),
            returnedAt: isoDate(loan.returnedAt),
            rating: loan.book.reviews[0]?.rating ?? null,
            comment: loan.book.reviews[0]?.comment ?? null,
          })),
        };
      },
    },
    {
      name: "mi_cuenta",
      description:
        "Estado de la cuenta de «Mi biblioteca»: suspensión vigente, grupo y si debe cambiar el PIN. No devuelve el carné ni el correo.",
      parameters: z.object({}),
      async execute() {
        const reader = await prisma.reader.findUnique({
          where: { id: readerId },
          select: {
            active: true,
            groupName: true,
            suspendedUntil: true,
            suspensionReason: true,
            pinMustChange: true,
            lastReaderLoginAt: true,
          },
        });
        if (!reader) return { result: { found: false } };
        return {
          result: {
            found: true,
            active: reader.active,
            groupName: reader.groupName,
            suspended: Boolean(
              reader.suspendedUntil &&
                reader.suspendedUntil.getTime() > Date.now(),
            ),
            suspendedUntil: isoDate(reader.suspendedUntil),
            suspensionReason: reader.suspensionReason,
            pinMustChange: reader.pinMustChange,
            lastLoginAt: isoDate(reader.lastReaderLoginAt),
          },
        };
      },
    },
    {
      name: "recomendar_para_mi",
      description:
        "Analiza el historial de préstamos y valoraciones de la persona lectora y devuelve sus categorías y autores favoritos, junto con libros disponibles del catálogo que aún no ha leído y que podrían gustarle. Úsala cuando pidan recomendaciones personalizadas.",
      parameters: z.object({
        limit: z.number().int().min(1).max(10).optional(),
      }),
      async execute(args) {
        const take = Math.min(Number(args.limit) || 5, 10);
        // Historial de préstamos devueltos con valoraciones
        const loans = await prisma.loan.findMany({
          where: { readerId, returnedAt: { not: null } },
          include: {
            book: { select: { id: true, title: true, author: true, category: true, tags: true } },
          },
          orderBy: { returnedAt: "desc" },
          take: 30,
        });

        // Categorías y autores más leídos (con peso por valoración)
        const categoryCount = new Map<string, number>();
        const authorCount = new Map<string, number>();
        const readBookIds = new Set<string>();

        for (const loan of loans) {
          readBookIds.add(loan.bookId);
          const weight = 1;
          categoryCount.set(
            loan.book.category,
            (categoryCount.get(loan.book.category) ?? 0) + weight,
          );
          authorCount.set(
            loan.book.author,
            (authorCount.get(loan.book.author) ?? 0) + weight,
          );
        }

        const topCategories = Array.from(categoryCount.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([cat]) => cat);
        const topAuthors = Array.from(authorCount.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([author]) => author);

        // Libros disponibles no leídos en las categorías favoritas
        const candidates = await prisma.book.findMany({
          where: {
            id: { notIn: Array.from(readBookIds) },
            category: { in: topCategories.length > 0 ? topCategories : undefined },
            copies: { gt: 0 },
          },
          orderBy: { createdAt: "desc" },
          take: take * 3,
        });

        const availability = await availabilityFor(candidates.map((b) => b.id));

        const recommendations = candidates
          .filter((book) => {
            const onLoan = availability.onLoan.get(book.id) ?? 0;
            return book.copies - onLoan > 0;
          })
          .slice(0, take)
          .map((book) => ({
            bookId: book.id,
            title: book.title,
            author: book.author,
            category: book.category,
            tags: book.tags,
            available: book.copies - (availability.onLoan.get(book.id) ?? 0),
          }));

        const bookCards = candidates
          .filter((book) => {
            const onLoan = availability.onLoan.get(book.id) ?? 0;
            return book.copies - onLoan > 0;
          })
          .slice(0, take)
          .map((book) => toAssistantBook(book, availability.onLoan.get(book.id) ?? 0));

        return {
          result: {
            totalRead: loans.length,
            favoriteCategories: topCategories,
            favoriteAuthors: topAuthors,
            recommendations,
            message:
              loans.length === 0
                ? "Aún no tienes historial de préstamos. Te recomiendo explorar el catálogo."
                : `Basándome en tus ${loans.length} préstamos anteriores, tus categorías favoritas son: ${topCategories.join(", ")}.`,
          },
          books: bookCards,
        };
      },
    },
    {
      name: "resumir_libro",
      description:
        "Genera un resumen breve de un libro a partir de su descripción, reseñas y datos bibliográficos. Úsala cuando pidan un resumen o quieran saber de qué trata un libro sin leer la ficha completa.",
      parameters: z.object({ bookId: z.string().max(60) }),
      async execute(args) {
        const book = await prisma.book.findUnique({
          where: { id: String(args.bookId ?? "") },
          include: {
            reviews: {
              where: { approved: true },
              select: { rating: true, comment: true },
              take: 5,
              orderBy: { createdAt: "desc" },
            },
          },
        });
        if (!book) return { result: { found: false, message: "Libro no encontrado." } };

        const reviewsSummary = book.reviews
          .map((r) => `${r.rating}/5: ${r.comment ?? "(sin comentario)"}`)
          .join(" | ");

        return {
          result: {
            found: true,
            bookId: book.id,
            title: book.title,
            author: book.author,
            category: book.category,
            year: book.year,
            pages: book.pages,
            description: clip(book.description, 1200),
            tags: book.tags,
            totalReviews: book.reviews.length,
            reviewsSummary: reviewsSummary || "Sin reseñas publicadas.",
            instruction:
              "Genera un resumen breve (3-4 frases) del libro basándote en la descripción y las reseñas. No inventes información que no esté en los datos proporcionados.",
          },
          books: [toAssistantBook(book)],
        };
      },
    },
  ];
}
