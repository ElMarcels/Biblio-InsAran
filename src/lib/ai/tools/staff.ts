import "server-only";

import type { Role } from "@prisma/client";
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
  }

  return tools;
}

export { bookLabel };
