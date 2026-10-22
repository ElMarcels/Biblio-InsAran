import "server-only";

import nodemailer, { type Transporter } from "nodemailer";

// ---------------------------------------------------------------------------
// Configuración
// ---------------------------------------------------------------------------

export type MailSettings = {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  from: string;
};

/**
 * Lee la configuración SMTP del entorno.
 *
 * Si falta lo esencial (el servidor o el remitente) devuelve `null`: la
 * plataforma sigue funcionando sin correo y los avisos se quedan solo en la
 * bandeja de «Mi biblioteca».
 */
export function mailSettings(): MailSettings | null {
  const host = process.env.SMTP_HOST?.trim();
  const from = process.env.SMTP_FROM?.trim();
  if (!host || !from) return null;

  const parsed = Number.parseInt(process.env.SMTP_PORT ?? "587", 10);
  const port = Number.isFinite(parsed) ? parsed : 587;
  const secure = process.env.SMTP_SECURE
    ? process.env.SMTP_SECURE === "true"
    : port === 465;

  const user = process.env.SMTP_USER?.trim() || undefined;
  const pass = process.env.SMTP_PASSWORD || undefined;

  return { host, port, secure, user, pass, from };
}

/** ¿Hay algún servidor de correo configurado? */
export function isMailConfigured(): boolean {
  return mailSettings() !== null;
}

// ---------------------------------------------------------------------------
// Envío
// ---------------------------------------------------------------------------

let transporter: Transporter | null = null;
let transporterKey = "";

/** Crea (o reutiliza) el transporte SMTP. */
function getTransporter(settings: MailSettings): Transporter {
  const key = `${settings.host}:${settings.port}:${settings.secure}:${settings.user ?? ""}`;
  if (!transporter || transporterKey !== key) {
    transporter = nodemailer.createTransport({
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      auth: settings.user ? { user: settings.user, pass: settings.pass } : undefined,
    });
    transporterKey = key;
  }
  return transporter;
}

export type MailResult = {
  sent: boolean;
  /** Motivo por el que no se ha enviado, si procede. */
  error?: string;
};

/**
 * Envía un correo en texto plano.
 *
 * NUNCA lanza: un fallo del servidor de correo no debe tumbar la operación
 * que lo provocar (un préstamo, una sanción…). Devuelve el resultado para que
 * quien llama pueda dejar constancia.
 */
export async function sendMail(input: {
  to: string;
  subject: string;
  text: string;
}): Promise<MailResult> {
  const settings = mailSettings();
  if (!settings) return { sent: false, error: "smtp-not-configured" };

  const to = input.to.trim();
  if (!to) return { sent: false, error: "no-recipient" };

  try {
    await getTransporter(settings).sendMail({
      from: settings.from,
      to,
      subject: input.subject,
      text: input.text,
    });
    return { sent: true };
  } catch (error) {
    console.error("No se pudo enviar el correo:", error);
    return {
      sent: false,
      error: error instanceof Error ? error.message : "unknown-error",
    };
  }
}
