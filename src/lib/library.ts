import "server-only";

import { prisma } from "./prisma";

/**
 * La autoría y las etiquetas se deducen de los propios libros: no hay una
 * tabla de autores ni de materias que mantener. Así, al añadir un libro con
 * una autoría nueva, su página aparece automáticamente.
 */

/** Clave de comparación de autorías: sin distinguir mayúsculas ni espacios. */
export function authorKey(name: string): string {
  return name.trim().toLocaleLowerCase("es").replace(/\s+/g, " ");
}

/** URL de la página de una autoría. */
export function authorHref(name: string): string {
  return `/autor/${encodeURIComponent(name.trim())}`;
}

/** URL de la página de una etiqueta. */
export function tagHref(tag: string): string {
  return `/etiquetas/${encodeURIComponent(tag)}`;
}

/** Ejemplares actualmente prestados (sin devolver) por libro. */
export async function onLoanCounts(
  bookIds: string[],
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (bookIds.length === 0) return result;

  const rows = await prisma.loan.groupBy({
    by: ["bookId"],
    where: { bookId: { in: bookIds }, returnedAt: null },
    _count: { _all: true },
  });
  for (const row of rows) result.set(row.bookId, row._count._all);
  return result;
}

/** Reservas pendientes por libro. */
export async function activeReservationCounts(
  bookIds: string[],
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (bookIds.length === 0) return result;

  const rows = await prisma.reservation.groupBy({
    by: ["bookId"],
    where: { bookId: { in: bookIds }, status: "ACTIVE" },
    _count: { _all: true },
  });
  for (const row of rows) result.set(row.bookId, row._count._all);
  return result;
}

/** Un préstamo está vencido si sigue activo y ya pasó su fecha de devolución. */
export function isOverdue(loan: {
  returnedAt: Date | null;
  dueAt: Date;
}): boolean {
  return loan.returnedAt === null && loan.dueAt.getTime() < Date.now();
}

/** Días de diferencia (positivo = en el futuro) respecto a hoy. */
export function daysUntil(date: Date): number {
  const day = 1000 * 60 * 60 * 24;
  const start = (value: Date) =>
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
  return Math.round((start(date) - start(new Date())) / day);
}
