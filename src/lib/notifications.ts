import "server-only";

import { formatDate, isPermanentSuspension } from "./format";
import { sendMail } from "./mailer";
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
// Envío
// ---------------------------------------------------------------------------

export type NotifyInput = {
  reader: { id: string; fullName: string; email: string | null };
  kind: NotificationKind;
  subject: string;
  body: string;
};

/**
 * Guarda un aviso en la bandeja de «Mi biblioteca» y, si la persona tiene
 * correo, lo envía también por email.
 *
 * NUNCA hace fallar la operación principal: si la base de datos o el servidor
 * de correo fallan, se registra el error y se sigue.
 */
export async function notifyReader(input: NotifyInput): Promise<void> {
  try {
    const to = input.reader.email?.trim() ?? "";
    const notification = await prisma.notification.create({
      data: {
        readerId: input.reader.id,
        kind: input.kind,
        to,
        subject: input.subject,
        body: input.body,
      },
    });

    if (!to) return;

    const result = await sendMail({ to, subject: input.subject, text: input.body });
    if (result.sent) {
      await prisma.notification.update({
        where: { id: notification.id },
        data: { sentAt: new Date() },
      });
    }
  } catch (error) {
    console.error("No se pudo registrar el aviso:", error);
  }
}
