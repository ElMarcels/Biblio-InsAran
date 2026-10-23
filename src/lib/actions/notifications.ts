"use server";

import { revalidatePath } from "next/cache";

import { assertManager, assertUser, AuthError } from "../auth";
import { recordAudit } from "../audit";
import { deliverNotification } from "../notifications";
import { prisma } from "../prisma";
import { assertReader, ReaderAuthError } from "../reader-auth";
import { runOverdueReminders } from "../reminders";
import type { ActionState } from "../validation";

const UNAUTHORIZED: ActionState = {
  status: "error",
  message: "actions.sessionExpired",
};

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

/** Marca un aviso como leído. */
export async function readerMarkNotificationReadAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let reader;
  try {
    reader = await assertReader();
  } catch (error) {
    if (error instanceof ReaderAuthError) return UNAUTHORIZED;
    throw error;
  }

  const id = text(formData, "id");
  if (!id) return { status: "error", message: "actions.notificationNoId" };

  const notification = await prisma.notification.findFirst({
    where: { id, readerId: reader.id },
    select: { id: true, readAt: true },
  });
  if (!notification) {
    return { status: "error", message: "actions.notificationGone" };
  }
  if (notification.readAt) {
    return { status: "success", message: "actions.notificationAlreadyRead" };
  }

  await prisma.notification.update({
    where: { id: notification.id },
    data: { readAt: new Date() },
  });

  revalidatePath("/mi-biblioteca/notificaciones");
  revalidatePath("/mi-biblioteca");
  return { status: "success", message: "actions.notificationMarkedRead" };
}

/** Marca como leídos todos los avisos de la persona lectora. */
export async function readerMarkAllNotificationsReadAction(): Promise<ActionState> {
  let reader;
  try {
    reader = await assertReader();
  } catch (error) {
    if (error instanceof ReaderAuthError) return UNAUTHORIZED;
    throw error;
  }

  await prisma.notification.updateMany({
    where: { readerId: reader.id, readAt: null },
    data: { readAt: new Date() },
  });

  revalidatePath("/mi-biblioteca/notificaciones");
  revalidatePath("/mi-biblioteca");
  return { status: "success", message: "actions.notificationMarkedRead" };
}

/**
 * Envía a las personas con préstamos vencidos el aviso de retraso.
 * Lo dispara el personal desde el panel de préstamos; el cron diario hace lo
 * mismo automáticamente en `runOverdueReminders`.
 */
export async function sendOverdueRemindersAction(): Promise<ActionState> {
  let user;
  try {
    user = await assertUser();
  } catch (error) {
    if (error instanceof AuthError) return UNAUTHORIZED;
    throw error;
  }

  const report = await runOverdueReminders({ trigger: "manual", userId: user.id });

  revalidatePath("/panel/prestamos");
  revalidatePath("/panel/tareas");
  revalidatePath("/panel/correo");
  revalidatePath("/panel/correo/salida");

  return {
    status: "success",
    message: "actions.overdueRemindersSent",
    messageParams: { sent: report.sent, queued: report.queued },
  };
}

/**
 * Reintenta el envío de un aviso concreto desde la bandeja de salida.
 * Solo dirección: si el correo ya se envió, no se vuelve a mandar.
 */
export async function retryNotificationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let user;
  try {
    user = await assertManager();
  } catch (error) {
    if (error instanceof AuthError) return UNAUTHORIZED;
    throw error;
  }

  const id = text(formData, "id");
  if (!id) return { status: "error", message: "actions.notificationNoId" };

  const result = await deliverNotification(id);

  switch (result.status) {
    case "missing":
      return { status: "error", message: "actions.notificationGone" };
    case "already-sent":
      return { status: "success", message: "actions.notificationAlreadySent" };
    case "no-recipient":
      return { status: "error", message: "actions.notificationNoRecipient" };
    case "not-configured":
      return { status: "error", message: "panel.mail.notConfigured" };
    case "failed":
      revalidatePath("/panel/correo/salida");
      revalidatePath("/panel/correo");
      return {
        status: "error",
        message: "actions.notificationResendFailed",
        messageParams: { error: result.error },
      };
  }

  await recordAudit({
    action: "NOTIFICATION_RESEND",
    entityType: "Notification",
    entityId: id,
    summary: "Aviso reenviado desde la bandeja de salida",
    userId: user.id,
  });

  revalidatePath("/panel/correo/salida");
  revalidatePath("/panel/correo");
  return { status: "success", message: "actions.notificationResent" };
}

/**
 * Reintenta los avisos que aún no se han enviado (pendientes o fallidos).
 * Va en lotes pequeños para no agotar el tiempo de la función.
 */
export async function retryUnsentNotificationsAction(): Promise<ActionState> {
  let user;
  try {
    user = await assertManager();
  } catch (error) {
    if (error instanceof AuthError) return UNAUTHORIZED;
    throw error;
  }

  const pending = await prisma.notification.findMany({
    where: { sentAt: null, to: { not: "" } },
    orderBy: [{ lastAttemptAt: "asc" }, { createdAt: "asc" }],
    take: 10,
    select: { id: true },
  });

  let sent = 0;
  for (const notification of pending) {
    const result = await deliverNotification(notification.id);
    if (result.status === "sent") sent += 1;
    // Si el correo no está configurado no tiene sentido seguir intentándolo.
    if (result.status === "not-configured") break;
  }

  await recordAudit({
    action: "NOTIFICATION_RETRY_FAILED",
    entityType: "Notification",
    entityId: null,
    summary: `Reintento de avisos: ${sent} enviados de ${pending.length}`,
    userId: user.id,
  });

  revalidatePath("/panel/correo/salida");
  revalidatePath("/panel/correo");

  if (pending.length === 0) {
    return { status: "success", message: "actions.notificationRetryNone" };
  }

  return {
    status: sent > 0 ? "success" : "error",
    message: "actions.notificationRetryBatch",
    messageParams: { sent, total: pending.length },
  };
}
