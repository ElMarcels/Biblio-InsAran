import "server-only";

import type { TranslationKey } from "./i18n/translate";
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

export const AUDIT_LABELS: Record<string, TranslationKey> = {
  BOOK_CREATE: "audit.bookCreate",
  BOOK_UPDATE: "audit.bookUpdate",
  BOOK_DELETE: "audit.bookDelete",
  COLLECTION_CREATE: "audit.collectionCreate",
  COLLECTION_UPDATE: "audit.collectionUpdate",
  COLLECTION_DELETE: "audit.collectionDelete",
  USER_CREATE: "audit.userCreate",
  USER_UPDATE: "audit.userUpdate",
  USER_ACTIVATE: "audit.userActivate",
  USER_DEACTIVATE: "audit.userDeactivate",
  USER_PASSWORD_RESET: "audit.userPasswordReset",
  USER_DELETE: "audit.userDelete",
  AUTH_LOGIN: "audit.authLogin",
  AUTH_LOGOUT: "audit.authLogout",
  READER_CREATE: "audit.readerCreate",
  READER_UPDATE: "audit.readerUpdate",
  READER_ACTIVATE: "audit.readerActivate",
  READER_DEACTIVATE: "audit.readerDeactivate",
  READER_SUSPEND: "audit.readerSuspend",
  READER_SUSPEND_LIFT: "audit.readerSuspendLift",
  LOAN_CREATE: "audit.loanCreate",
  LOAN_RETURN: "audit.loanReturn",
  LOAN_RENEW: "audit.loanRenew",
  RESERVATION_CREATE: "audit.reservationCreate",
  RESERVATION_CANCEL: "audit.reservationCancel",
  RESERVATION_FULFILL: "audit.reservationFulfill",
};
