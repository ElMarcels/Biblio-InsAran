"use server";

import { assertManager, AuthError } from "../auth";
import type { TranslationKey } from "../i18n/messages";
import { isMailConfigured, sendMail } from "../mailer";
import { type ActionState } from "../validation";

const UNAUTHORIZED: ActionState = {
  status: "error",
  message: "actions.sessionExpired",
};

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

/**
 * Traduce el fallo del servidor de correo a un mensaje con una pista útil: los
 * dos errores habituales (credenciales y conexión) no significan lo mismo y
 * conviene distinguirlos en el panel.
 */
function failureMessage(error: string | undefined): TranslationKey {
  const detail = error ?? "";
  if (/(534|535|EAUTH|Application-specific password|Invalid login)/i.test(detail)) {
    return "panel.mail.sendFailedAuth";
  }
  if (/(ESOCKET|ETIMEDOUT|ECONNECTION|ECONNRESET|ENOTFOUND|Unexpected socket close)/i.test(detail)) {
    return "panel.mail.sendFailedSocket";
  }
  return "panel.mail.sendFailed";
}

export async function sendTestEmailAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await assertManager();
  } catch (error) {
    if (error instanceof AuthError) return UNAUTHORIZED;
    throw error;
  }

  if (!isMailConfigured()) {
    return {
      status: "error",
      message: "panel.mail.notConfigured",
    };
  }

  const to = text(formData, "to").trim();
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return {
      status: "error",
      message: "panel.mail.toRequired",
      fieldErrors: { to: "panel.mail.toRequired" },
    };
  }

  const result = await sendMail({
    to,
    subject: "Prueba de correo - Biblioteca Institut d'Aran",
    text: [
      "Este es un correo de prueba enviado desde el panel de administración de la Biblioteca Institut d'Aran.",
      "",
      "Si recibes este mensaje, la configuración SMTP con Google Workspace es correcta.",
      "",
      "— Biblioteca Institut d'Aran",
    ].join("\n"),
  });

  if (!result.sent) {
    return {
      status: "error",
      message: failureMessage(result.error),
      messageParams: { error: result.error ?? "unknown" },
    };
  }

  return {
    status: "success",
    message: "panel.mail.sent",
  };
}
