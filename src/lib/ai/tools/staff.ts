import "server-only";

import type { Prisma, Role } from "@prisma/client";
import { z } from "zod";

import { daysLate } from "../../format";
import { fetchIsbnMetadata, isValidIsbn, normalizeIsbn } from "../../isbn";
import { prisma } from "../../prisma";
import type { AssistantTool } from "../types";
import {
  availabilityFor,
  bookForModel,
  bookLabel,
  cleanQuery,
  isoDate,
  toAssistantBook,
} from "./helpers";

const limitSchema = z.number().int().min(1).max(40).optional();

function readerRef(index: number): string {
  return `Lector/a ${index + 1}`;
}

async function readerSnapshot(readerId: string) {
  const [reader, loans, reservations, notifications] = await Promise.all([
    prisma.reader.findUnique({
      where: { id: readerId },
      select: {
        id: true,
        active: true,
        groupName: true,
        suspendedUntil: true,
        suspensionReason: true,
        pinMustChange: true,
        createdAt: true,
      },
    }),
    prisma.loan.count({ where: { readerId, returnedAt: null } }),
    prisma.reservation.count({ where: { readerId, status: "ACTIVE" } }),
    prisma.notification.count({ where: { readerId, readAt: null } }),
  ]);
  if (!reader) return null;
  return {
    readerId: reader.id,
    active: reader.active,
    groupName: reader.groupName,
    suspended: Boolean(
      reader.suspendedUntil && reader.suspendedUntil.getTime() > Date.now(),
    ),
    suspendedUntil: isoDate(reader.suspendedUntil),
    suspensionReason: reader.suspensionReason,
    pinMustChange: reader.pinMustChange,
    activeLoans: loans,
    activeReservations: reservations,
    unreadNotifications: notifications,
    since: isoDate(reader.createdAt),
  };
}

export function staffTools(role: Role): AssistantTool[] {
  const manager = role === "OWNER" || role === "ADMIN";

  const tools: AssistantTool[] = [
    {
      name: "resumen_panel",
      description:
        "Resumen operativo del panel: préstamos activos y vencidos, reservas pendientes, solicitudes de compra, lectores suspendidos y avisos sin leer.",
      parameters: z.object({}),
      async execute() {
        const now = new Date();
        const [books, readers, activeLoans, overdue, reservations, suggestions, suspended, unread] =
          await Promise.all([
            prisma.book.count(),
            prisma.reader.count({ where: { active: true } }),
            prisma.loan.count({ where: { returnedAt: null } }),
            prisma.loan.count({ where: { returnedAt: null, dueAt: { lt: now } } }),
            prisma.reservation.count({ where: { status: "ACTIVE" } }),
            prisma.purchaseSuggestion.count({ where: { status: "PENDING" } }),
            prisma.reader.count({
              where: { suspendedUntil: { gt: now } },
            }),
            prisma.notification.count({ where: { readAt: null } }),
          ]);
        return {
          result: {
            books,
            activeReaders: readers,
            activeLoans,
            overdueLoans: overdue,
            pendingReservations: reservations,
            pendingSuggestions: suggestions,
            suspendedReaders: suspended,
            unreadNotifications: unread,
          },
        };
      },
    },
    {
      name: "prestamos_vencidos",
      description:
        "Préstamos sin devolver cuya fecha ya ha pasado, ordenados por días de retraso. Incluye referencias opacas de lector y libro.",
      parameters: z.object({ limit: limitSchema }),
      async execute(args) {
        const take = Math.min(Number(args.limit) || 15, 40);
        const loans = await prisma.loan.findMany({
          where: { returnedAt: null, dueAt: { lt: new Date() } },
          include: { book: true },
          orderBy: { dueAt: "asc" },
          take,
        });
        const now = new Date();
        return {
          result: loans.map((loan, index) => ({
            loanId: loan.id,
            readerRef: readerRef(index),
            readerId: loan.readerId,
            bookId: loan.bookId,
            title: loan.book.title,
            author: loan.book.author,
            dueAt: isoDate(loan.dueAt),
            daysLate: daysLate(loan.dueAt, now),
            renewals: loan.renewals,
          })),
          books: loans.map((loan) => toAssistantBook(loan.book)),
        };
      },
    },
    {
      name: "prestamos_por_vencer",
      description:
        "Préstamos que vencen en los próximos días (por defecto 7), para avisar a tiempo.",
      parameters: z.object({
        days: z.number().int().min(1).max(60).optional(),
        limit: limitSchema,
      }),
      async execute(args) {
        const days = Math.min(Number(args.days) || 7, 60);
        const take = Math.min(Number(args.limit) || 15, 40);
        const now = new Date();
        const until = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
        const loans = await prisma.loan.findMany({
          where: { returnedAt: null, dueAt: { gte: now, lte: until } },
          include: { book: true },
          orderBy: { dueAt: "asc" },
          take,
        });
        return {
          result: loans.map((loan, index) => ({
            loanId: loan.id,
            readerRef: readerRef(index),
            readerId: loan.readerId,
            bookId: loan.bookId,
            title: loan.book.title,
            author: loan.book.author,
            dueAt: isoDate(loan.dueAt),
            daysLeft: Math.ceil(
              (loan.dueAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
            ),
          })),
          books: loans.map((loan) => toAssistantBook(loan.book)),
        };
      },
    },
    {
      name: "reservas_pendientes",
      description:
        "Reservas activas pendientes de servir, con la posición en la cola y la disponibilidad del libro.",
      parameters: z.object({ limit: limitSchema }),
      async execute(args) {
        const take = Math.min(Number(args.limit) || 15, 40);
        const reservations = await prisma.reservation.findMany({
          where: { status: "ACTIVE" },
          include: { book: true },
          orderBy: { createdAt: "asc" },
          take,
        });
        const availability = await availabilityFor(
          reservations.map((reservation) => reservation.bookId),
        );
        return {
          result: reservations.map((reservation, index) => ({
            reservationId: reservation.id,
            readerRef: readerRef(index),
            readerId: reservation.readerId,
            bookId: reservation.bookId,
            title: reservation.book.title,
            author: reservation.book.author,
            reservedAt: isoDate(reservation.createdAt),
            available: Math.max(
              0,
              reservation.book.copies -
                (availability.onLoan.get(reservation.bookId) ?? 0),
            ),
            notes: reservation.notes,
          })),
          books: reservations.map((reservation) =>
            toAssistantBook(
              reservation.book,
              availability.onLoan.get(reservation.bookId) ?? 0,
            ),
          ),
        };
      },
    },
    {
      name: "solicitudes_compra",
      description:
        "Solicitudes de compra del alumnado, profesorado o personal, con su estado y datos bibliográficos.",
      parameters: z.object({
        status: z.enum(["PENDING", "APPROVED", "REJECTED", "ALL"]).optional(),
        limit: limitSchema,
      }),
      async execute(args) {
        const take = Math.min(Number(args.limit) || 15, 40);
        const status =
          args.status && args.status !== "ALL"
            ? (args.status as "PENDING" | "APPROVED" | "REJECTED")
            : undefined;
        const suggestions = await prisma.purchaseSuggestion.findMany({
          where: status ? { status } : {},
          orderBy: { createdAt: "desc" },
          take,
          select: {
            id: true,
            title: true,
            author: true,
            isbn: true,
            reason: true,
            status: true,
            createdAt: true,
            readerId: true,
            userId: true,
            bookId: true,
            notes: true,
          },
        });
        return {
          result: suggestions.map((suggestion, index) => ({
            suggestionId: suggestion.id,
            ref: `Solicitud ${index + 1}`,
            title: suggestion.title,
            author: suggestion.author,
            isbn: suggestion.isbn,
            reason: suggestion.reason,
            status: suggestion.status,
            date: isoDate(suggestion.createdAt),
            proposedByReader: Boolean(suggestion.readerId),
            proposedByStaff: Boolean(suggestion.userId),
            linkedBookId: suggestion.bookId,
            notes: suggestion.notes,
          })),
        };
      },
    },
    {
      name: "buscar_lectores",
      description:
        "Busca lectores y lectoras por nombre, carné, grupo o correo. Devuelve referencias opacas y datos operativos, nunca nombres ni correos.",
      parameters: z.object({
        query: z.string().max(120),
        limit: limitSchema,
      }),
      async execute(args) {
        const query = cleanQuery(args.query);
        if (!query) return { result: [] };
        const take = Math.min(Number(args.limit) || 10, 20);
        const readers = await prisma.reader.findMany({
          where: {
            OR: [
              { fullName: { contains: query, mode: "insensitive" } },
              { cardNumber: { contains: query, mode: "insensitive" } },
              { groupName: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
            ],
          },
          orderBy: { fullName: "asc" },
          take,
          select: {
            id: true,
            groupName: true,
            active: true,
            suspendedUntil: true,
            createdAt: true,
          },
        });
        const enriched = await Promise.all(
          readers.map(async (reader, index) => {
            const snapshot = await readerSnapshot(reader.id);
            return snapshot ? { ref: readerRef(index), ...snapshot } : null;
          }),
        );
        return { result: enriched.filter(Boolean) };
      },
    },
    {
      name: "ficha_lector",
      description:
        "Datos operativos de un lector o lectora (grupo, estado, suspensión, préstamos y reservas) a partir de su id.",
      parameters: z.object({ readerId: z.string().max(60) }),
      async execute(args) {
        const snapshot = await readerSnapshot(String(args.readerId ?? ""));
        return {
          result: snapshot ?? {
            found: false,
            message: "No existe ese lector o lectora.",
          },
        };
      },
    },
    {
      name: "buscar_libros_panel",
      description:
        "Busca libros en el catálogo con datos de gestión: ejemplares, préstamos, reservas, CDU, ubicación y materias.",
      parameters: z.object({
        query: z.string().max(120).optional(),
        limit: limitSchema,
      }),
      async execute(args) {
        const query = cleanQuery(args.query);
        const take = Math.min(Number(args.limit) || 10, 20);
        const books = await prisma.book.findMany({
          where: query
            ? {
                OR: [
                  { title: { contains: query, mode: "insensitive" } },
                  { author: { contains: query, mode: "insensitive" } },
                  { isbn: { contains: query, mode: "insensitive" } },
                  { recordNumber: { contains: query, mode: "insensitive" } },
                  { cdu: { contains: query, mode: "insensitive" } },
                ],
              }
            : {},
          orderBy: { createdAt: "desc" },
          take,
        });
        const availability = await availabilityFor(books.map((book) => book.id));
        return {
          result: books.map((book) =>
            bookForModel(
              book,
              Math.max(0, book.copies - (availability.onLoan.get(book.id) ?? 0)),
              availability.reserved.get(book.id) ?? 0,
            ),
          ),
          books: books.map((book) =>
            toAssistantBook(book, availability.onLoan.get(book.id) ?? 0),
          ),
        };
      },
    },
    {
      name: "libros_incompletos",
      description:
        "Libros a los que les falta información útil: sinopsis, CDU, ubicación, número de registro, páginas, ISBN o portada.",
      parameters: z.object({ limit: limitSchema }),
      async execute(args) {
        const take = Math.min(Number(args.limit) || 15, 40);
        const books = await prisma.book.findMany({
          where: {
            OR: [
              { description: null },
              { cdu: null },
              { location: null },
              { recordNumber: null },
              { pages: null },
              { isbn: null },
              { coverUrl: null },
            ],
          },
          orderBy: { createdAt: "desc" },
          take,
          select: {
            id: true,
            title: true,
            author: true,
            isbn: true,
            pages: true,
            location: true,
            cdu: true,
            recordNumber: true,
            description: true,
            coverUrl: true,
          },
        });
        return {
          result: books.map((book) => ({
            bookId: book.id,
            title: book.title,
            author: book.author,
            missing: [
              !book.isbn && "isbn",
              !book.pages && "pages",
              !book.location && "location",
              !book.cdu && "cdu",
              !book.recordNumber && "recordNumber",
              !book.description && "description",
              !book.coverUrl && "cover",
            ].filter(Boolean),
          })),
        };
      },
    },
    {
      name: "posibles_duplicados",
      description:
        "Detecta parejas de libros con el mismo ISBN o con título y autoría idénticos.",
      parameters: z.object({}),
      async execute() {
        const books = await prisma.book.findMany({
          select: { id: true, title: true, author: true, isbn: true },
          orderBy: { createdAt: "asc" },
        });
        const groups = new Map<string, typeof books>();
        for (const book of books) {
          const key = book.isbn
            ? `isbn:${book.isbn.trim().toLowerCase()}`
            : `ta:${book.title.trim().toLowerCase()}|${book.author.trim().toLowerCase()}`;
          const group = groups.get(key) ?? [];
          group.push(book);
          groups.set(key, group);
        }
        const duplicates = Array.from(groups.entries())
          .filter(([, group]) => group.length > 1)
          .map(([key, group]) => ({
            match: key.startsWith("isbn:") ? "isbn" : "title",
            books: group.map((book) => ({
              bookId: book.id,
              title: book.title,
              author: book.author,
              isbn: book.isbn,
            })),
          }));
        return { result: duplicates };
      },
    },
    {
      name: "actividad_reciente",
      description:
        "Últimos movimientos registrados en la auditoría (sin datos personales sensibles).",
      parameters: z.object({ limit: limitSchema }),
      async execute(args) {
        const take = Math.min(Number(args.limit) || 15, 40);
        const logs = await prisma.auditLog.findMany({
          orderBy: { createdAt: "desc" },
          take,
          select: {
            action: true,
            entityType: true,
            summary: true,
            createdAt: true,
          },
        });
        return {
          result: logs.map((log) => ({
            action: log.action,
            entity: log.entityType,
            summary: log.summary,
            date: isoDate(log.createdAt),
          })),
        };
      },
    },
    {
      name: "estadisticas_panel",
      description:
        "Estadísticas de circulación: préstamos por mes, libros más prestados, categorías y lectores más activos (sin nombres).",
      parameters: z.object({}),
      async execute() {
        const since = new Date();
        since.setUTCDate(1);
        since.setUTCMonth(since.getUTCMonth() - 5);
        since.setUTCHours(0, 0, 0, 0);
        const [loans, topBooks, categories] = await Promise.all([
          prisma.loan.findMany({
            where: { loanedAt: { gte: since } },
            select: { loanedAt: true },
          }),
          prisma.loan.groupBy({
            by: ["bookId"],
            _count: { bookId: true },
            orderBy: { _count: { bookId: "desc" } },
            take: 10,
          }),
          prisma.book.groupBy({
            by: ["category"],
            _count: { category: true },
            orderBy: { _count: { category: "desc" } },
          }),
        ]);
        const monthKey = (date: Date) => date.toISOString().slice(0, 7);
        const byMonth = new Map<string, number>();
        for (const loan of loans) {
          const key = monthKey(loan.loanedAt);
          byMonth.set(key, (byMonth.get(key) ?? 0) + 1);
        }
        const topIds = topBooks.map((row) => row.bookId);
        const books = await prisma.book.findMany({
          where: { id: { in: topIds } },
          select: { id: true, title: true, author: true },
        });
        const byId = new Map(books.map((book) => [book.id, book]));
        return {
          result: {
            byMonth: Array.from(byMonth.entries())
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([month, count]) => ({ month, loans: count })),
            topBooks: topBooks.map((row) => ({
              bookId: row.bookId,
              title: byId.get(row.bookId)?.title,
              author: byId.get(row.bookId)?.author,
              loans: row._count.bookId,
            })),
            categories: categories.map((row) => ({
              category: row.category,
              titles: row._count.category,
            })),
          },
        };
      },
    },
    {
      name: "consultar_isbn",
      description:
        "Consulta Open Library por ISBN para obtener título, autoría, editorial, año, páginas y portada antes de catalogar.",
      parameters: z.object({ isbn: z.string().max(30) }),
      async execute(args) {
        const isbn = normalizeIsbn(String(args.isbn ?? ""));
        if (!isValidIsbn(isbn)) {
          return { result: { status: "invalid" } };
        }
        try {
          const data = await fetchIsbnMetadata(isbn);
          return {
            result: data ? { status: "success", data } : { status: "notFound" },
          };
        } catch {
          return { result: { status: "error" } };
        }
      },
    },
    {
      name: "resenas_pendientes",
      description:
        "Reseñas pendientes de moderación o ya publicadas, con la valoración y el comentario.",
      parameters: z.object({
        approved: z.boolean().optional(),
        limit: limitSchema,
      }),
      async execute(args) {
        const take = Math.min(Number(args.limit) || 15, 40);
        const reviews = await prisma.review.findMany({
          where:
            typeof args.approved === "boolean"
              ? { approved: args.approved }
              : {},
          include: { book: { select: { title: true, author: true } } },
          orderBy: { createdAt: "desc" },
          take,
        });
        return {
          result: reviews.map((review) => ({
            reviewId: review.id,
            bookId: review.bookId,
            title: review.book.title,
            author: review.book.author,
            rating: review.rating,
            comment: review.comment,
            approved: review.approved,
            date: isoDate(review.createdAt),
          })),
        };
      },
    },
    {
      name: "listas_curadas",
      description:
        "Listas públicas de la biblioteca (novedades, recomendados, club de lectura…) con sus libros.",
      parameters: z.object({}),
      async execute() {
        const collections = await prisma.collection.findMany({
          where: { ownerReaderId: null },
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
            slug: collection.slug,
            description: collection.description,
            position: collection.position,
            books: collection.books.map((entry) => ({
              bookId: entry.bookId,
              title: entry.book.title,
              author: entry.book.author,
              position: entry.position,
            })),
          })),
        };
      },
    },
    {
      name: "novedades_plataforma",
      description: "Últimas novedades publicadas en el changelog del personal.",
      parameters: z.object({ limit: limitSchema }),
      async execute(args) {
        const take = Math.min(Number(args.limit) || 5, 20);
        const changelogs = await prisma.changelog.findMany({
          orderBy: { createdAt: "desc" },
          take,
          select: { id: true, title: true, body: true, createdAt: true },
        });
        return {
          result: changelogs.map((changelog) => ({
            changelogId: changelog.id,
            title: changelog.title,
            body: changelog.body,
            date: isoDate(changelog.createdAt),
          })),
        };
      },
    },
    {
      name: "tareas_panel",
      description:
        "Bandeja de tareas del panel: préstamos vencidos, vencen hoy, reservas por servir, solicitudes pendientes, sanciones caducadas, libros sin prestar nunca y libros sin ejemplares libres.",
      parameters: z.object({ limit: limitSchema }),
      async execute(args) {
        const take = Math.min(Number(args.limit) || 10, 40);
        const now = new Date();
        const dayStart = new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
        );
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
        const [
          overdue,
          dueToday,
          reservations,
          suggestions,
          expiredSuspensions,
          neverLoaned,
          grouped,
          totals,
        ] = await Promise.all([
          prisma.loan.findMany({
            where: { returnedAt: null, dueAt: { lt: now } },
            orderBy: { dueAt: "asc" },
            take,
            include: { book: true },
          }),
          prisma.loan.findMany({
            where: { returnedAt: null, dueAt: { gte: now, lt: dayEnd } },
            orderBy: { dueAt: "asc" },
            take,
            include: { book: true },
          }),
          prisma.reservation.findMany({
            where: { status: "ACTIVE" },
            orderBy: { createdAt: "asc" },
            take,
            include: { book: true },
          }),
          prisma.purchaseSuggestion.findMany({
            where: { status: "PENDING" },
            orderBy: { createdAt: "asc" },
            take,
            select: { id: true, title: true, author: true, createdAt: true },
          }),
          prisma.reader.findMany({
            where: { suspendedUntil: { lt: now } },
            orderBy: { suspendedUntil: "asc" },
            take,
            select: { id: true, suspendedUntil: true, suspensionReason: true },
          }),
          prisma.book.findMany({
            where: { loans: { none: {} } },
            orderBy: { title: "asc" },
            take,
            select: { id: true, title: true, author: true, category: true },
          }),
          prisma.loan.groupBy({
            by: ["bookId"],
            where: { returnedAt: null },
            _count: { _all: true },
          }),
          Promise.all([
            prisma.loan.count({ where: { returnedAt: null, dueAt: { lt: now } } }),
            prisma.loan.count({
              where: { returnedAt: null, dueAt: { gte: now, lt: dayEnd } },
            }),
            prisma.reservation.count({ where: { status: "ACTIVE" } }),
            prisma.purchaseSuggestion.count({ where: { status: "PENDING" } }),
            prisma.reader.count({ where: { suspendedUntil: { lt: now } } }),
            prisma.book.count({ where: { loans: { none: {} } } }),
          ]),
        ]);
        const onLoan = new Map(grouped.map((row) => [row.bookId, row._count._all]));
        const loanedBooks = await prisma.book.findMany({
          where: { id: { in: Array.from(onLoan.keys()) } },
          select: { id: true, title: true, author: true, copies: true },
          orderBy: { title: "asc" },
        });
        const noCopies = loanedBooks.filter(
          (book) => (onLoan.get(book.id) ?? 0) >= book.copies,
        );
        const [overdueCount, dueTodayCount, reservationsCount, suggestionsCount, expiredCount, neverLoanedCount] =
          totals;
        return {
          result: {
            overdue: {
              count: overdueCount,
              items: overdue.map((loan, index) => ({
                loanId: loan.id,
                readerRef: readerRef(index),
                readerId: loan.readerId,
                bookId: loan.bookId,
                title: loan.book.title,
                author: loan.book.author,
                dueAt: isoDate(loan.dueAt),
                daysLate: daysLate(loan.dueAt, now),
              })),
            },
            dueToday: {
              count: dueTodayCount,
              items: dueToday.map((loan, index) => ({
                loanId: loan.id,
                readerRef: readerRef(index),
                readerId: loan.readerId,
                bookId: loan.bookId,
                title: loan.book.title,
                author: loan.book.author,
                dueAt: isoDate(loan.dueAt),
              })),
            },
            pendingReservations: {
              count: reservationsCount,
              items: reservations.map((reservation, index) => ({
                reservationId: reservation.id,
                readerRef: readerRef(index),
                readerId: reservation.readerId,
                bookId: reservation.bookId,
                title: reservation.book.title,
                author: reservation.book.author,
                reservedAt: isoDate(reservation.createdAt),
              })),
            },
            pendingSuggestions: {
              count: suggestionsCount,
              items: suggestions.map((suggestion) => ({
                suggestionId: suggestion.id,
                title: suggestion.title,
                author: suggestion.author,
                date: isoDate(suggestion.createdAt),
              })),
            },
            expiredSuspensions: {
              count: expiredCount,
              items: expiredSuspensions.map((reader, index) => ({
                readerRef: readerRef(index),
                readerId: reader.id,
                suspendedUntil: isoDate(reader.suspendedUntil),
                reason: reader.suspensionReason,
              })),
            },
            neverLoaned: {
              count: neverLoanedCount,
              items: neverLoaned,
            },
            noAvailableCopies: {
              count: noCopies.length,
              items: noCopies.map((book) => ({
                bookId: book.id,
                title: book.title,
                author: book.author,
                onLoan: onLoan.get(book.id) ?? book.copies,
                copies: book.copies,
              })),
            },
          },
          books: [...overdue, ...dueToday].map((loan) =>
            toAssistantBook(loan.book, onLoan.get(loan.bookId) ?? 0),
          ),
        };
      },
    },
    {
      name: "prestamos_lector",
      description:
        "Préstamos de un lector o lectora concreto, activos o también devueltos, ordenados por fecha de devolución.",
      parameters: z.object({
        readerId: z.string().max(60),
        includeReturned: z.boolean().optional(),
        limit: limitSchema,
      }),
      async execute(args) {
        const readerId = String(args.readerId ?? "");
        if (!readerId) return { result: [] };
        const take = Math.min(Number(args.limit) || 20, 40);
        const loans = await prisma.loan.findMany({
          where: {
            readerId,
            ...(args.includeReturned ? {} : { returnedAt: null }),
          },
          orderBy: { dueAt: "asc" },
          take,
          include: { book: true },
        });
        const now = new Date();
        return {
          result: loans.map((loan) => ({
            loanId: loan.id,
            bookId: loan.bookId,
            title: loan.book.title,
            author: loan.book.author,
            loanedAt: isoDate(loan.loanedAt),
            dueAt: isoDate(loan.dueAt),
            returnedAt: isoDate(loan.returnedAt),
            overdue:
              !loan.returnedAt && loan.dueAt.getTime() < now.getTime()
                ? daysLate(loan.dueAt, now)
                : 0,
            renewals: loan.renewals,
            notes: loan.notes,
          })),
          books: loans.map((loan) => toAssistantBook(loan.book)),
        };
      },
    },
    {
      name: "reservas_lector",
      description:
        "Reservas de un lector o lectora concreto, con su estado y la disponibilidad actual del libro.",
      parameters: z.object({
        readerId: z.string().max(60),
        status: z.enum(["ACTIVE", "FULFILLED", "CANCELLED", "ALL"]).optional(),
        limit: limitSchema,
      }),
      async execute(args) {
        const readerId = String(args.readerId ?? "");
        if (!readerId) return { result: [] };
        const take = Math.min(Number(args.limit) || 20, 40);
        const status =
          args.status && args.status !== "ALL"
            ? (args.status as "ACTIVE" | "FULFILLED" | "CANCELLED")
            : undefined;
        const reservations = await prisma.reservation.findMany({
          where: { readerId, ...(status ? { status } : {}) },
          orderBy: { createdAt: "desc" },
          take,
          include: { book: true },
        });
        const availability = await availabilityFor(
          reservations.map((reservation) => reservation.bookId),
        );
        return {
          result: reservations.map((reservation) => ({
            reservationId: reservation.id,
            bookId: reservation.bookId,
            title: reservation.book.title,
            author: reservation.book.author,
            status: reservation.status,
            reservedAt: isoDate(reservation.createdAt),
            resolvedAt: isoDate(reservation.resolvedAt),
            available: Math.max(
              0,
              reservation.book.copies -
                (availability.onLoan.get(reservation.bookId) ?? 0),
            ),
            notes: reservation.notes,
          })),
          books: reservations.map((reservation) =>
            toAssistantBook(
              reservation.book,
              availability.onLoan.get(reservation.bookId) ?? 0,
            ),
          ),
        };
      },
    },
    {
      name: "ficha_libro_panel",
      description:
        "Ficha completa de un libro para gestión: datos bibliográficos, ejemplares, préstamos activos, reservas, listas y reseñas.",
      parameters: z.object({ bookId: z.string().max(60) }),
      async execute(args) {
        const bookId = String(args.bookId ?? "");
        if (!bookId) return { result: { found: false } };
        const book = await prisma.book.findUnique({
          where: { id: bookId },
          include: {
            collections: { include: { collection: true } },
            _count: { select: { loans: true, reservations: true, reviews: true } },
          },
        });
        if (!book) {
          return { result: { found: false, message: "No existe ese libro." } };
        }
        const availability = await availabilityFor([book.id]);
        return {
          result: {
            found: true,
            ...bookForModel(
              book,
              Math.max(0, book.copies - (availability.onLoan.get(book.id) ?? 0)),
              availability.reserved.get(book.id) ?? 0,
            ),
            onLoan: availability.onLoan.get(book.id) ?? 0,
            totalLoans: book._count.loans,
            totalReservations: book._count.reservations,
            totalReviews: book._count.reviews,
            collections: book.collections
              .filter((entry) => !entry.collection.ownerReaderId)
              .map((entry) => ({
                collectionId: entry.collectionId,
                name: entry.collection.name,
                position: entry.position,
              })),
          },
          books: [toAssistantBook(book, availability.onLoan.get(book.id) ?? 0)],
        };
      },
    },
    {
      name: "vencimientos_mes",
      description:
        "Calendario de vencimientos: préstamos sin devolver que vencen en un mes concreto (por defecto, el actual).",
      parameters: z.object({
        year: z.number().int().min(2000).max(2200).optional(),
        month: z.number().int().min(1).max(12).optional(),
        limit: limitSchema,
      }),
      async execute(args) {
        const now = new Date();
        const year = Number(args.year) || now.getUTCFullYear();
        const month = Number(args.month) || now.getUTCMonth() + 1;
        const take = Math.min(Number(args.limit) || 40, 40);
        const start = new Date(Date.UTC(year, month - 1, 1));
        const end = new Date(Date.UTC(year, month, 1));
        const loans = await prisma.loan.findMany({
          where: { returnedAt: null, dueAt: { gte: start, lt: end } },
          orderBy: { dueAt: "asc" },
          take,
          include: { book: true },
        });
        return {
          result: {
            year,
            month,
            total: loans.length,
            items: loans.map((loan, index) => ({
              loanId: loan.id,
              readerRef: readerRef(index),
              readerId: loan.readerId,
              bookId: loan.bookId,
              title: loan.book.title,
              author: loan.book.author,
              dueAt: isoDate(loan.dueAt),
            })),
          },
          books: loans.map((loan) => toAssistantBook(loan.book)),
        };
      },
    },
    {
      name: "sanciones_lectores",
      description:
        "Lectores y lectoras con el préstamo suspendido: vigentes o ya caducadas.",
      parameters: z.object({
        status: z.enum(["ACTIVE", "EXPIRED", "ALL"]).optional(),
        limit: limitSchema,
      }),
      async execute(args) {
        const now = new Date();
        const take = Math.min(Number(args.limit) || 20, 40);
        const status = args.status ?? "ALL";
        const where =
          status === "ACTIVE"
            ? { suspendedUntil: { gt: now } }
            : status === "EXPIRED"
              ? { suspendedUntil: { lt: now } }
              : { suspendedUntil: { not: null } };
        const readers = await prisma.reader.findMany({
          where,
          orderBy: { suspendedUntil: "asc" },
          take,
          select: {
            id: true,
            groupName: true,
            active: true,
            suspendedUntil: true,
            suspensionReason: true,
          },
        });
        return {
          result: readers.map((reader, index) => ({
            readerRef: readerRef(index),
            readerId: reader.id,
            groupName: reader.groupName,
            active: reader.active,
            suspended: Boolean(
              reader.suspendedUntil && reader.suspendedUntil.getTime() > now.getTime(),
            ),
            suspendedUntil: isoDate(reader.suspendedUntil),
            reason: reader.suspensionReason,
          })),
        };
      },
    },
  ];

  if (manager) {
    tools.push({
      name: "cuentas_personal",
      description:
        "Lista las cuentas de personal (usuario, nombre visible, rol y estado). Solo para dirección.",
      parameters: z.object({}),
      async execute() {
        const users = await prisma.user.findMany({
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            username: true,
            displayName: true,
            role: true,
            active: true,
            lastLoginAt: true,
            createdAt: true,
          },
        });
        return {
          result: users.map((user) => ({
            userId: user.id,
            username: user.username,
            displayName: user.displayName,
            role: user.role,
            active: user.active,
            lastLoginAt: isoDate(user.lastLoginAt),
            since: isoDate(user.createdAt),
          })),
        };
      },
    });
    tools.push({
      name: "bandeja_salida",
      description:
        "Bandeja de salida de correo: avisos enviados, pendientes o fallidos, con destinatario, asunto, intentos y error. Solo para dirección.",
      parameters: z.object({
        status: z.enum(["ALL", "PENDING", "FAILED", "SENT"]).optional(),
        limit: limitSchema,
      }),
      async execute(args) {
        const take = Math.min(Number(args.limit) || 15, 40);
        const status = args.status ?? "ALL";
        const where: Prisma.NotificationWhereInput = { to: { not: "" } };
        if (status === "SENT") where.sentAt = { not: null };
        if (status === "PENDING") {
          where.sentAt = null;
          where.error = null;
        }
        if (status === "FAILED") {
          where.sentAt = null;
          where.error = { not: null };
        }
        const notifications = await prisma.notification.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take,
          select: {
            id: true,
            subject: true,
            kind: true,
            to: true,
            sentAt: true,
            lastAttemptAt: true,
            attempts: true,
            error: true,
            createdAt: true,
            reader: { select: { id: true } },
          },
        });
        return {
          result: notifications.map((notification, index) => ({
            notificationId: notification.id,
            readerRef: readerRef(index),
            readerId: notification.reader?.id ?? null,
            subject: notification.subject,
            kind: notification.kind,
            status: notification.sentAt
              ? "sent"
              : notification.error
                ? "failed"
                : "pending",
            attempts: notification.attempts,
            error: notification.error,
            sentAt: isoDate(notification.sentAt),
            lastAttemptAt: isoDate(notification.lastAttemptAt),
            date: isoDate(notification.createdAt),
          })),
        };
      },
    });
  }

  return tools;
}

export { bookLabel };
