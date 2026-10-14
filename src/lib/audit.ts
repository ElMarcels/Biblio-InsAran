import "server-only";

import { prisma } from "./prisma";

/**
 * Registra una acción en el historial de actividad.
 * NUNCA debe hacer fallar la operación principal: si el registro falla, se
 * ignora silenciosamente.
 */
export async function recordAudit(input: {
  action: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
  userId?: string | null;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        summary: input.summary,
        userId: input.userId ?? null,
      },
    });
  } catch (error) {
    console.error("No se pudo registrar la actividad:", error);
  }
}

export const AUDIT_LABELS: Record<string, string> = {
  BOOK_CREATE: "Libro añadido",
  BOOK_UPDATE: "Libro editado",
  BOOK_DELETE: "Libro eliminado",
  USER_CREATE: "Usuario creado",
  USER_UPDATE: "Usuario actualizado",
  USER_ACTIVATE: "Usuario activado",
  USER_DEACTIVATE: "Usuario desactivado",
  USER_PASSWORD_RESET: "Contraseña restablecida",
  USER_DELETE: "Usuario eliminado",
  AUTH_LOGIN: "Inicio de sesión",
  AUTH_LOGOUT: "Cierre de sesión",
  READER_CREATE: "Lector/a dado de alta",
  READER_UPDATE: "Lector/a editado",
  READER_ACTIVATE: "Lector/a activado",
  READER_DEACTIVATE: "Lector/a desactivado",
  LOAN_CREATE: "Préstamo registrado",
  LOAN_RETURN: "Devolución registrada",
  LOAN_RENEW: "Préstamo prorrogado",
  RESERVATION_CREATE: "Reserva creada",
  RESERVATION_CANCEL: "Reserva anulada",
  RESERVATION_FULFILL: "Reserva servida",
};
