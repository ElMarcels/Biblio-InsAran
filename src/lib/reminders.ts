import "server-only";

import { recordAudit } from "./audit";
import { daysLate } from "./format";
import { NOTIFICATION_TEXTS, notifyReader } from "./notifications";
import { prisma } from "./prisma";

/**
 * Días de retraso en los que se manda un recordatorio automático.
 * El cron avisa solo en estos hitos: ni todos los días (sería ruido) ni una
 * sola vez (el aviso se perdería si el préstamo sigue sin devolverse).
 */
export const OVERDUE_REMINDER_DAYS = [3, 7, 14] as const;

export type ReminderReport = {
  /** Préstamos vencidos revisados. */
  overdue: number;
  /** Correos enviados. */
  sent: number;
  /** Avisos que solo han quedado en la bandeja (sin correo o sin SMTP). */
  queued: number;
  /** Préstamos que ya tenían un aviso hoy o en el mismo hito. */
  duplicates: number;
  /** Personas sin dirección de correo (subconjunto de `queued`). */
  withoutEmail: number;
  /** Fallos inesperados al registrar el aviso. */
  errors: number;
};

function startOfToday(now: Date): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

/** Mayor hito de aviso alcanzado por un retraso de `days` días. */
export function overdueBucket(days: number): number | null {
  let bucket: number | null = null;
  for (const value of OVERDUE_REMINDER_DAYS) {
    if (days >= value) bucket = value;
  }
  return bucket;
}

/**
 * Envía los recordatorios de retraso.
 *
 * - `cron`: solo en los hitos (3, 7 y 14 días), con clave única por préstamo
 *   e hito para que no se repita aunque el proceso se ejecute dos veces.
 * - `manual`: a todos los préstamos vencidos, cuando el personal lo pide.
 *
 * En ambos casos se manda como mucho un aviso por préstamo y día, para que el
 * cron y el botón del panel no se dupliquen.
 */
export async function runOverdueReminders(options: {
  trigger: "cron" | "manual";
  userId?: string | null;
}): Promise<ReminderReport> {
  const now = new Date();

  const loans = await prisma.loan.findMany({
    where: { returnedAt: null, dueAt: { lt: now } },
    include: {
      book: { select: { title: true } },
      reader: { select: { id: true, fullName: true, email: true } },
    },
    orderBy: { dueAt: "asc" },
  });

  const report: ReminderReport = {
    overdue: loans.length,
    sent: 0,
    queued: 0,
    duplicates: 0,
    withoutEmail: 0,
    errors: 0,
  };
  if (loans.length === 0) return report;

  // Avisos de retraso ya creados hoy: evita que el cron y el botón manual
  // manden dos correos por el mismo préstamo el mismo día.
  const alreadyToday = await prisma.notification.findMany({
    where: {
      kind: "overdue",
      loanId: { in: loans.map((loan) => loan.id) },
      createdAt: { gte: startOfToday(now) },
    },
    select: { loanId: true },
  });
  const notifiedToday = new Set(alreadyToday.map((row) => row.loanId));

  for (const loan of loans) {
    if (notifiedToday.has(loan.id)) {
      report.duplicates += 1;
      continue;
    }

    const days = daysLate(loan.dueAt, now);
    const bucket = overdueBucket(days);
    if (options.trigger === "cron" && bucket === null) continue;

    if (!loan.reader.email) report.withoutEmail += 1;

    const texts = NOTIFICATION_TEXTS.overdue({
      name: loan.reader.fullName,
      title: loan.book.title,
      dueAt: loan.dueAt,
      days,
    });

    const outcome = await notifyReader({
      reader: loan.reader,
      kind: "overdue",
      subject: texts.subject,
      body: texts.body,
      loanId: loan.id,
      dedupeKey:
        options.trigger === "cron" && bucket !== null
          ? `overdue:${loan.id}:${bucket}`
          : null,
    });

    switch (outcome.status) {
      case "sent":
        report.sent += 1;
        break;
      case "queued":
        report.queued += 1;
        break;
      case "duplicate":
        report.duplicates += 1;
        break;
      case "error":
        report.errors += 1;
        break;
    }
  }

  await recordAudit({
    action:
      options.trigger === "cron"
        ? "NOTIFICATION_OVERDUE_CRON"
        : "NOTIFICATION_OVERDUE_REMINDERS",
    entityType: "Notification",
    entityId: null,
    summary: `Recordatorios de retraso (${
      options.trigger === "cron" ? "cron" : "manual"
    }): ${report.overdue} vencidos, ${report.sent} enviados, ${
      report.queued
    } solo en bandeja, ${report.duplicates} ya avisados`,
    userId: options.userId ?? null,
  });

  return report;
}
