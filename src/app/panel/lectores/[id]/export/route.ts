import { getCurrentUser } from "@/lib/auth";
import { csvHeaders, toCsv } from "@/lib/csv";
import { formatDate } from "@/lib/format";
import { isOverdue } from "@/lib/library";
import { reservationStatusLabel } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/validation";

type Params = Promise<{ id: string }>;

/** Estado legible de un préstamo para el informe. */
function loanState(loan: { returnedAt: Date | null; dueAt: Date }): string {
  if (loan.returnedAt) return "Devuelto";
  return isOverdue(loan) ? "Vencido" : "En curso";
}

/**
 * Descarga el historial completo de un lector/a (préstamos y reservas) en CSV.
 * Requiere sesión: cualquier cuenta del panel puede consultarlo.
 */
export async function GET(_request: Request, { params }: { params: Params }) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("No autorizado", { status: 401 });
  }

  const { id } = await params;
  const reader = await prisma.reader.findUnique({
    where: { id },
    include: {
      loans: {
        include: { book: { select: { title: true, author: true } } },
        orderBy: { loanedAt: "desc" },
      },
      reservations: {
        include: { book: { select: { title: true, author: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!reader) {
    return new Response("No encontrado", { status: 404 });
  }

  const rows: Array<Array<string>> = [
    [
      "Tipo",
      "Libro",
      "Autoría",
      "Fecha",
      "Devolución prevista",
      "Fecha de devolución",
      "Estado",
      "Notas",
    ],
  ];

  for (const loan of reader.loans) {
    rows.push([
      "Préstamo",
      loan.book.title,
      loan.book.author,
      formatDate(loan.loanedAt),
      formatDate(loan.dueAt),
      loan.returnedAt ? formatDate(loan.returnedAt) : "",
      loanState(loan),
      loan.notes ?? "",
    ]);
  }

  for (const reservation of reader.reservations) {
    rows.push([
      "Reserva",
      reservation.book.title,
      reservation.book.author,
      formatDate(reservation.createdAt),
      "",
      reservation.resolvedAt ? formatDate(reservation.resolvedAt) : "",
      reservationStatusLabel(reservation.status),
      reservation.notes ?? "",
    ]);
  }

  const filename = `historial-${slugify(reader.fullName) || "lector"}.csv`;

  return new Response(toCsv(rows), { headers: csvHeaders(filename) });
}
