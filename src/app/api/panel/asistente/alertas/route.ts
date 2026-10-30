import { NextResponse } from "next/server";

import { canPersist, resolveActor } from "@/lib/ai/auth";
import { isAssistantEnabled } from "@/lib/ai/config";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Alertas proactivas para el personal (préstamos vencidos, solicitudes pendientes, etc.). */
export async function GET() {
  if (!isAssistantEnabled()) {
    return NextResponse.json({ ok: true, alerts: [] });
  }

  let actor;
  try {
    actor = await resolveActor("STAFF", { staffOnly: true });
  } catch {
    return NextResponse.json({ ok: true, alerts: [] });
  }

  if (!canPersist(actor) || actor.scope !== "STAFF") {
    return NextResponse.json({ ok: true, alerts: [] });
  }

  const alerts: { type: string; message: string; icon: string }[] = [];
  const now = new Date();

  // Préstamos vencidos
  const overdue = await prisma.loan.count({
    where: { returnedAt: null, dueAt: { lt: now } },
  });
  if (overdue > 0) {
    alerts.push({
      type: "overdue_loans",
      message: `${overdue} préstamo${overdue !== 1 ? "s" : ""} vencido${overdue !== 1 ? "s" : ""}`,
      icon: "🔴",
    });
  }

  // Solicitudes de compra pendientes
  const pendingSuggestions = await prisma.purchaseSuggestion.count({
    where: { status: "PENDING" },
  });
  if (pendingSuggestions > 0) {
    alerts.push({
      type: "pending_suggestions",
      message: `${pendingSuggestions} solicitud${pendingSuggestions !== 1 ? "es" : ""} de compra pendiente${pendingSuggestions !== 1 ? "s" : ""}`,
      icon: "📋",
    });
  }

  // Reseñas pendientes de moderación
  const pendingReviews = await prisma.review.count({
    where: { approved: false },
  });
  if (pendingReviews > 0) {
    alerts.push({
      type: "pending_reviews",
      message: `${pendingReviews} reseña${pendingReviews !== 1 ? "s" : ""} pendiente${pendingReviews !== 1 ? "s" : ""} de moderación`,
      icon: "⭐",
    });
  }

  // Reservas pendientes de servir
  const pendingReservations = await prisma.reservation.count({
    where: { status: "ACTIVE" },
  });
  if (pendingReservations > 0) {
    alerts.push({
      type: "pending_reservations",
      message: `${pendingReservations} reserva${pendingReservations !== 1 ? "s" : ""} pendiente${pendingReservations !== 1 ? "s" : ""} de servir`,
      icon: "📦",
    });
  }

  // Avisos sin leer
  const unreadNotifications = await prisma.notification.count({
    where: { readAt: null },
  });
  if (unreadNotifications > 0) {
    alerts.push({
      type: "unread_notifications",
      message: `${unreadNotifications} aviso${unreadNotifications !== 1 ? "s" : ""} sin leer`,
      icon: "🔔",
    });
  }

  return NextResponse.json({ ok: true, alerts });
}
