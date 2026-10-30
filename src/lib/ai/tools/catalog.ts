import "server-only";

import { z } from "zod";

import { prisma } from "../../prisma";
import type { AssistantTool } from "../types";
import {
  availabilityFor,
  bookForModel,
  cleanQuery,
  toAssistantBook,
} from "./helpers";

const limitSchema = z.number().int().min(1).max(20).optional();

async function searchBooks(args: {
  query?: string;
  category?: string;
  language?: string;
  availableOnly?: boolean;
  limit?: number;
}) {
  const query = cleanQuery(args.query);
  const limit = args.limit ?? 8;

  const where = {
    ...(query
      ? {
          OR: [
            { title: { contains: query, mode: "insensitive" as const } },
            { author: { contains: query, mode: "insensitive" as const } },
            { publisher: { contains: query, mode: "insensitive" as const } },
            { description: { contains: query, mode: "insensitive" as const } },
            { tags: { has: query } },
          ],
        }
      : {}),
    ...(args.category ? { category: args.category } : {}),
    ...(args.language ? { language: args.language } : {}),
  };

  const books = await prisma.book.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
    take: args.availableOnly ? Math.min(limit * 3, 60) : limit,
  });

  const { onLoan, reserved } = await availabilityFor(books.map((book) => book.id));
  const filtered = args.availableOnly
    ? books.filter(
        (book) => book.copies - (onLoan.get(book.id) ?? 0) > 0,
      )
    : books;
  const selected = filtered.slice(0, limit);

  return {
    total: filtered.length,
    books: selected.map((book) =>
      bookForModel(
        book,
        Math.max(0, book.copies - (onLoan.get(book.id) ?? 0)),
        reserved.get(book.id) ?? 0,
      ),
    ),
    cards: selected.map((book) =>
      toAssistantBook(book, onLoan.get(book.id) ?? 0),
    ),
  };
}

export const catalogTools: AssistantTool[] = [
  {
    name: "buscar_catalogo",
    description:
      "Busca libros reales del catálogo por título, autoría, editorial, descripción o etiqueta. Úsala siempre antes de recomendar o afirmar que un libro existe.",
    parameters: z.object({
      query: z.string().max(120).optional(),
      category: z.string().max(60).optional(),
      language: z.string().max(40).optional(),
      availableOnly: z.boolean().optional(),
      limit: limitSchema,
    }),
    async execute(args) {
      const data = await searchBooks(args as Parameters<typeof searchBooks>[0]);
      return {
        result: {
          total: data.total,
          books: data.books,
          note:
            data.total === 0
              ? "No hay resultados en el catálogo. No inventes títulos."
              : undefined,
        },
        books: data.cards,
      };
    },
  },
  {
    name: "ficha_libro",
    description:
      "Devuelve la ficha completa de un libro (sinopsis, materias, ubicación, CDU, ejemplares, disponibilidad, reservas y valoraciones). Acepta el id o el título.",
    parameters: z.object({
      bookId: z.string().max(60).optional(),
      title: z.string().max(220).optional(),
    }),
    async execute(args) {
      const bookId = typeof args.bookId === "string" ? args.bookId : "";
      const title = cleanQuery(args.title);
      const book = bookId
        ? await prisma.book.findUnique({ where: { id: bookId } })
        : title
          ? await prisma.book.findFirst({
              where: { title: { contains: title, mode: "insensitive" } },
              orderBy: { createdAt: "desc" },
            })
          : null;
      if (!book) {
        return { result: { found: false, message: "Libro no encontrado." } };
      }

      const [onLoan, reserved, reviews, loans, similar] = await Promise.all([
        prisma.loan.count({ where: { bookId: book.id, returnedAt: null } }),
        prisma.reservation.count({
          where: { bookId: book.id, status: "ACTIVE" },
        }),
        prisma.review.findMany({
          where: { bookId: book.id, approved: true },
          orderBy: { createdAt: "desc" },
          take: 4,
          select: { rating: true, comment: true, createdAt: true },
        }),
        prisma.loan.count({ where: { bookId: book.id } }),
        prisma.book.findMany({
          where: {
            id: { not: book.id },
            OR: [
              { category: book.category },
              ...(book.tags.length > 0 ? [{ tags: { hasSome: book.tags } }] : []),
            ],
          },
          orderBy: { createdAt: "desc" },
          take: 4,
        }),
      ]);

      const similarAvailability = await availabilityFor(similar.map((item) => item.id));
      const available = Math.max(0, book.copies - onLoan);

      return {
        result: {
          found: true,
          book: bookForModel(book, available, reserved),
          totalLoans: loans,
          reviews: reviews.map((review) => ({
            rating: review.rating,
            comment: review.comment,
            date: review.createdAt.toISOString().slice(0, 10),
          })),
          similar: similar.map((item) =>
            bookForModel(
              item,
              Math.max(0, item.copies - (similarAvailability.onLoan.get(item.id) ?? 0)),
              similarAvailability.reserved.get(item.id) ?? 0,
            ),
          ),
        },
        books: [
          toAssistantBook(book, onLoan),
          ...similar.map((item) =>
            toAssistantBook(item, similarAvailability.onLoan.get(item.id) ?? 0),
          ),
        ],
      };
    },
  },
  {
    name: "libros_similares",
    description:
      "Busca libros parecidos a uno dado por categoría y materias. Útil para recomendaciones dentro del catálogo real.",
    parameters: z.object({
      bookId: z.string().max(60),
      limit: limitSchema,
    }),
    async execute(args) {
      const bookId = String(args.bookId ?? "");
      const book = await prisma.book.findUnique({ where: { id: bookId } });
      if (!book) return { result: { found: false } };

      const books = await prisma.book.findMany({
        where: {
          id: { not: book.id },
          OR: [
            { category: book.category },
            { author: book.author },
            ...(book.tags.length > 0 ? [{ tags: { hasSome: book.tags } }] : []),
          ],
        },
        orderBy: { createdAt: "desc" },
        take: Math.min(Number(args.limit) || 6, 12),
      });
      const availability = await availabilityFor(books.map((item) => item.id));
      return {
        result: books.map((item) =>
          bookForModel(
            item,
            Math.max(0, item.copies - (availability.onLoan.get(item.id) ?? 0)),
            availability.reserved.get(item.id) ?? 0,
          ),
        ),
        books: books.map((item) =>
          toAssistantBook(item, availability.onLoan.get(item.id) ?? 0),
        ),
      };
    },
  },
  {
    name: "novedades",
    description: "Devuelve los últimos libros incorporados al catálogo.",
    parameters: z.object({ limit: limitSchema }),
    async execute(args) {
      const books = await prisma.book.findMany({
        orderBy: { createdAt: "desc" },
        take: Math.min(Number(args.limit) || 6, 12),
      });
      const data = await availabilityFor(books.map((book) => book.id));
      return {
        result: books.map((book) =>
          bookForModel(
            book,
            Math.max(0, book.copies - (data.onLoan.get(book.id) ?? 0)),
            data.reserved.get(book.id) ?? 0,
          ),
        ),
        books: books.map((book) =>
          toAssistantBook(book, data.onLoan.get(book.id) ?? 0),
        ),
      };
    },
  },
  {
    name: "mas_prestados",
    description: "Lista los libros con más préstamos históricos.",
    parameters: z.object({ limit: limitSchema }),
    async execute(args) {
      const limit = Math.min(Number(args.limit) || 6, 12);
      const grouped = await prisma.loan.groupBy({
        by: ["bookId"],
        _count: { bookId: true },
      });
      const ranked = grouped
        .sort((a, b) => b._count.bookId - a._count.bookId)
        .slice(0, limit);
      const books = await prisma.book.findMany({
        where: { id: { in: ranked.map((row) => row.bookId) } },
      });
      const byId = new Map(books.map((book) => [book.id, book]));
      const ordered = ranked
        .map((row) => byId.get(row.bookId))
        .filter((book): book is NonNullable<typeof book> => Boolean(book));
      const data = await availabilityFor(ordered.map((book) => book.id));
      return {
        result: ordered.map((book, index) => ({
          ...bookForModel(
            book,
            Math.max(0, book.copies - (data.onLoan.get(book.id) ?? 0)),
            data.reserved.get(book.id) ?? 0,
          ),
          loans: ranked[index]?._count.bookId ?? 0,
        })),
        books: ordered.map((book) =>
          toAssistantBook(book, data.onLoan.get(book.id) ?? 0),
        ),
      };
    },
  },
  {
    name: "estadisticas_catalogo",
    description:
      "Resumen público del catálogo: número de títulos, ejemplares, préstamos activos, reservas y reparto por categoría.",
    parameters: z.object({}),
    async execute() {
      const [titles, copies, onLoan, reservations, categories] =
        await Promise.all([
          prisma.book.count(),
          prisma.book.aggregate({ _sum: { copies: true } }),
          prisma.loan.count({ where: { returnedAt: null } }),
          prisma.reservation.count({ where: { status: "ACTIVE" } }),
          prisma.book.groupBy({
            by: ["category"],
            _count: { category: true },
            orderBy: { _count: { category: "desc" } },
          }),
        ]);
      return {
        result: {
          titles,
          copies: copies._sum.copies ?? 0,
          onLoan,
          reservations,
          categories: categories.map((row) => ({
            category: row.category,
            titles: row._count.category,
          })),
        },
      };
    },
  },
];
