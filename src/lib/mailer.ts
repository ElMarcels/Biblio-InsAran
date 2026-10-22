import "server-only";

import dns from "node:dns";
import nodemailer, { type Transporter } from "nodemailer";

// ---------------------------------------------------------------------------
// Configuración
// ---------------------------------------------------------------------------

/**
 * Prioriza IPv4 al resolver el servidor de correo. En contenedores con IPv6
 * anunciado pero sin salida real, nodemailer falla al conectar por la IPv6 con
 * «Unexpected socket close»; forzar IPv4 evita ese caso.
 */
dns.setDefaultResultOrder("ipv4first");

export type MailSettings = {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  from: string;
};

/** Puertos estándar de correo y su modo de cifrado habitual. */
const STANDARD_TLS: Record<number, boolean> = {
  25: false,
  465: true,
  587: false,
};

function parsePort(raw: string | undefined): number {
  const parsed = Number.parseInt(raw ?? "587", 10);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 65535) return 587;
  return parsed;
}

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

  const port = parsePort(process.env.SMTP_PORT);

  // El modo de cifrado se deduce del puerto. Si `SMTP_SECURE` contradice al
  // puerto estándar (por ejemplo, TLS directo en el 587), se hace caso al
  // puerto: esa contradicción hace que el servidor cierre la conexión nada
  // más abrirla («Unexpected socket close»). En puertos no estándar manda la
  // variable de entorno.
  const requested = process.env.SMTP_SECURE?.trim().toLowerCase();
  let secure = STANDARD_TLS[port] ?? port === 465;
  if (requested === "true" || requested === "false") {
    const explicit = requested === "true";
    if (STANDARD_TLS[port] === undefined || STANDARD_TLS[port] === explicit) {
      secure = explicit;
    }
  }

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
function getTransporter(settings: MailSettings, port: number, secure: boolean): Transporter {
  const key = `${settings.host}:${port}:${secure}:${settings.user ?? ""}`;
  if (!transporter || transporterKey !== key) {
    const debug = process.env.SMTP_DEBUG === "true";
    transporter = nodemailer.createTransport({
      host: settings.host,
      port,
      secure,
      auth: settings.user ? { user: settings.user, pass: settings.pass } : undefined,
      // Diagnóstico opcional: SMTP_DEBUG="true" imprime la conversación SMTP.
      logger: debug,
      debug,
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      socketTimeout: 30_000,
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

type Attempt = { port: number; secure: boolean };

/**
 * Intentos de conexión: primero el puerto configurado y, si es uno de los
 * estándar (587/465), también el otro. Algunos servidores y cortafuegos solo
 * permiten uno de los dos, y así el envío funciona sin tocar el `.env`.
 */
function attemptsFor(settings: MailSettings): Attempt[] {
  const first: Attempt = { port: settings.port, secure: settings.secure };
  if (settings.port === 465) return [first, { port: 587, secure: false }];
  if (settings.port === 587) return [first, { port: 465, secure: true }];
  return [first];
}

/**
 * ¿El fallo ocurrió antes de que el servidor contestara? Solo en ese caso
 * tiene sentido probar otro puerto; un error de autenticación (535) o de
 * remitente (550) no mejora cambiando de puerto.
 */
function isConnectionFailure(error: unknown): boolean {
  const err = error as { responseCode?: number; command?: string };
  if (typeof err.responseCode === "number") return false;
  return !err.command || err.command === "CONN";
}

/** Texto de error con el código y el comando SMTP, útil para diagnosticar. */
function describeMailError(error: unknown): string {
  if (!(error instanceof Error)) return "unknown-error";
  const err = error as Error & {
    code?: string;
    command?: string;
    responseCode?: number;
  };
  const details: string[] = [];
  if (err.code) details.push(err.code);
  if (err.responseCode) details.push(`SMTP ${err.responseCode}`);
  if (err.command) details.push(`comando ${err.command}`);
  return details.length ? `${err.message} (${details.join(", ")})` : err.message;
}

/**
 * Envía un correo en texto plano.
 *
 * NUNCA lanza: un fallo del servidor de correo no debe tumbar la operación
 * que lo provocó (un préstamo, una sanción…). Devuelve el resultado para que
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

  let lastError = "unknown-error";
  const failures: string[] = [];

  for (const attempt of attemptsFor(settings)) {
    try {
      await getTransporter(settings, attempt.port, attempt.secure).sendMail({
        from: settings.from,
        to,
        subject: input.subject,
        text: input.text,
      });
      return { sent: true };
    } catch (error) {
      lastError = describeMailError(error);
      const label = `${settings.host}:${attempt.port} (${attempt.secure ? "TLS" : "STARTTLS"})`;
      failures.push(`${label}: ${lastError}`);
      console.error(`No se pudo enviar el correo por ${label}:`, error);
      if (!isConnectionFailure(error)) break;
    }
  }

  return { sent: false, error: failures.join(" | ") || lastError };
}
