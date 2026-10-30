import { NextResponse } from "next/server";

import { canPersist, resolveActor } from "@/lib/ai/auth";
import { isAssistantEnabled } from "@/lib/ai/config";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Alertas proactivas para la identidad actual (préstamos por vencer, avisos, etc.). */
export async function GET() {
  if (!isAssistantEnabled()) {
    return NextResponse.json({ ok: true, alerts: [] });
  }

  let actor;
  try {
    actor = await resolveActor("READER", {});
  } catch {
    return NextResponse.json({ ok: true, alerts: [] });
  }

  if (!canPersist(actor) || actor.scope !== "READER") {
    return NextResponse.json({ ok: true, alerts: [] });
  }

  const readerId = actor.readerId;
  const alerts: { type: string; message: string; icon: string }[] = [];

  // Préstamos que vencen en los próximos 3 días
  const soon = new Date();
  soon.setDate(soon.getDate() + 3);
  const expiringLoans = await prisma.loan.findMany({
    where: {
      readerId,
      returnedAt: null,
      dueAt: { lte: soon, gte: new Date() },
    },
    include: { book: { select: { title: true } } },
    take: 5,
  });
  for (const loan of expiringLoans) {
    const days = Math.ceil((loan.dueAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    alerts.push({
      type: "loan_expiring",
      message: `«${loan.book.title}» vence en ${days} día${days !== 1 ? "s" : ""}`,
      icon: "⏰",
    });
  }

  // Préstamos vencidos
  const overdue = await prisma.loan.count({
    where: { readerId, returnedAt: null, dueAt: { lt: new Date() } },
  });
  if (overdue > 0) {
    alerts.push({
      type: "loan_overdue",
      message: `Tienes ${overdue} préstamo${overdue !== 1 ? "s" : ""} vencido${overdue !== 1 ? "s" : ""}`,
      icon: "🔴",
    });
  }

  // Avisos sin leer
  const unread = await prisma.notification.count({
    where: { readerId, readAt: null },
  });
  if (unread > 0) {
    alerts.push({
      type: "unread_notifications",
      message: `Tienes ${unread} aviso${unread !== 1 ? "s" : ""} sin leer`,
      icon: "🔔",
    });
  }

  // Reservas listas para recoger (fulfilled)
  const readyReservations = await prisma.reservation.count({
    where: { readerId, status: "FULFILLED" },
  });
  if (readyReservations > 0) {
    alerts.push({
      type: "reservation_ready",
      message: `${readyReservations} reserva${readyReservations !== 1 ? "s" : ""} lista${readyReservations !== 1 ? "s" : ""} para recoger`,
      icon: "📦",
    });
  }

  return NextResponse.json({ ok: true, alerts });
}
