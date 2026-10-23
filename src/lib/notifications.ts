import "server-only";

import { Prisma } from "@prisma/client";

import { formatDate, isPermanentSuspension } from "./format";
import { isMailConfigured, sendMail } from "./mailer";
import { prisma } from "./prisma";

// ---------------------------------------------------------------------------
// Bandeja de avisos
// ---------------------------------------------------------------------------

/** Tipos de aviso que se guardan en la bandeja de «Mi biblioteca». */
export const NOTIFICATION_KINDS = [
  "loan",
  "reservation",
  "overdue",
  "suspension",
] as const;

export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

/** Remitente visible en los correos (la biblioteca). */
const SIGNATURE = "Biblioteca Institut d'Aran";

/** Plantilla común de los correos. */
function letter(name: string, paragraphs: string[]): string {
  return [
    `Hola, ${name}:`,
    "",
    ...paragraphs.flatMap((paragraph) => [paragraph, ""]),
    "Un saludo,",
    SIGNATURE,
  ].join("\n");
}

/**
 * Textos de los avisos. Van en castellano: son cartas para las familias y
 * no dependen del idioma que la persona tenga activo en el navegador.
 */
export const NOTIFICATION_TEXTS = {
  loan: (input: {
    name: string;
    title: string;
    dueAt: Date;
  }): { subject: string; body: string } => ({
    subject: `Préstamo de «${input.title}»`,
    body: letter(input.name, [
      `Te hemos prestado «${input.title}».`,
      `Tienes que devolverlo antes del ${formatDate(input.dueAt)}.`,
      "Puedes consultarlo y prorrogarlo desde «Mi biblioteca».",
    ]),
  }),

  reservation: (input: { name: string; title: string }): { subject: string; body: string } => ({
    subject: `Ya está disponible «${input.title}»`,
    body: letter(input.name, [
      `El libro «${input.title}» que reservaste ya está disponible.`,
      "Pásate por la biblioteca para recogerlo: lo guardamos durante unos días.",
    ]),
  }),

  overdue: (input: {
    name: string;
    title: string;
    dueAt: Date;
    days: number;
  }): { subject: string; body: string } => ({
    subject: `«${input.title}» se ha pasado de fecha`,
    body: letter(input.name, [
      `El libro «${input.title}» debía devolverse el ${formatDate(input.dueAt)} y ahora acumula ${input.days} día(s) de retraso.`,
      "Si ya lo has devuelto, ignora este mensaje. Si no, puedes renovarlo desde «Mi biblioteca» si no hay nadie más esperando.",
    ]),
  }),

  suspension: (input: {
    name: string;
    until: Date | null;
    reason?: string | null;
  }): { subject: string; body: string } => ({
    subject: "Préstamo suspendido",
    body: letter(input.name, [
      isPermanentSuspension(input.until)
        ? "Tu préstamo queda suspendido de forma permanente."
        : `Tu préstamo queda suspendido hasta el ${formatDate(input.until)}.`,
      input.reason ? `Motivo: ${input.reason}.` : "",
      "Cuando termine la sanción podrás volver a llevarte libros con normalidad.",
    ]),
  }),
};

// ---------------------------------------------------------------------------
// Entrega
// ---------------------------------------------------------------------------

export type DeliveryResult =
  | { status: "sent" }
  | { status: "already-sent" }
  | { status: "missing" }
  | { status: "no-recipient" }
  | { status: "not-configured" }
  | { status: "failed"; error: string };

/**
 * Intenta enviar un aviso ya guardado y deja constancia del resultado.
 *
 * Es la única puerta de salida del correo: la usan el alta del aviso, los
 * reintentos de la bandeja de salida y el envío de recordatorios. Si el
 * servidor de correo no está configurado no toca el aviso: queda pendiente.
 */
export async function deliverNotification(id: string): Promise<DeliveryResult> {
  const notification = await prisma.notification.findUnique({
    where: { id },
    select: { to: true, subject: true, body: true, sentAt: true },
  });
  if (!notification) return { status: "missing" };
  if (notification.sentAt) return { status: "already-sent" };

  const to = notification.to.trim();
  if (!to) return { status: "no-recipient" };
  if (!isMailConfigured()) return { status: "not-configured" };

  const result = await sendMail({
    to,
    subject: notification.subject,
    text: notification.body,
  });
  const now = new Date();

  if (result.sent) {
    await prisma.notification.update({
      where: { id },
      data: {
        sentAt: now,
        lastAttemptAt: now,
        attempts: { increment: 1 },
        error: null,
      },
    });
    return { status: "sent" };
  }

  const error = result.error ?? "unknown-error";
  await prisma.notification.update({
    where: { id },
    data: {
      lastAttemptAt: now,
      attempts: { increment: 1 },
      error,
    },
  });
  return { status: "failed", error };
}

// ---------------------------------------------------------------------------
// Alta del aviso
// ---------------------------------------------------------------------------

export type NotifyInput = {
  reader: { id: string; fullName: string; email: string | null };
  kind: NotificationKind;
  subject: string;
  body: string;
  /** Préstamo que origina el aviso, si lo hay. */
  loanId?: string | null;
  /** Clave única para no repetir avisos automáticos (ver `reminders.ts`). */
  dedupeKey?: string | null;
};

export type NotifyOutcome =
  | { status: "sent" }
  | { status: "queued"; reason: "no-recipient" | "not-configured" | "failed" }
  | { status: "duplicate" }
  | { status: "error" };

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
  );
}

/**
 * Guarda un aviso en la bandeja de «Mi biblioteca» y, si la persona tiene
 * correo, intenta enviarlo también por email.
 *
 * NUNCA hace fallar la operación principal: si la base de datos o el servidor
 * de correo fallan, se registra el error y se sigue. Los envíos fallidos o
 * pendientes quedan en la bandeja de salida para reintentarlos.
 */
export async function notifyReader(input: NotifyInput): Promise<NotifyOutcome> {
  try {
    const to = input.reader.email?.trim() ?? "";

    let id: string;
    try {
      const created = await prisma.notification.create({
        data: {
          readerId: input.reader.id,
          kind: input.kind,
          to,
          subject: input.subject,
          body: input.body,
          loanId: input.loanId ?? null,
          dedupeKey: input.dedupeKey ?? null,
        },
        select: { id: true },
      });
      id = created.id;
    } catch (error) {
      // Ya existe un aviso con esa clave: no se repite.
      if (isUniqueViolation(error)) return { status: "duplicate" };
      throw error;
    }

    const delivery = await deliverNotification(id);
    switch (delivery.status) {
      case "sent":
        return { status: "sent" };
      case "no-recipient":
        return { status: "queued", reason: "no-recipient" };
      case "not-configured":
        return { status: "queued", reason: "not-configured" };
      default:
        return { status: "queued", reason: "failed" };
    }
  } catch (error) {
    console.error("No se pudo registrar el aviso:", error);
    return { status: "error" };
  }
}
