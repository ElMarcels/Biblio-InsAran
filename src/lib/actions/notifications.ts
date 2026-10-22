"use server";

import { revalidatePath } from "next/cache";

import { assertUser, AuthError } from "../auth";
import { recordAudit } from "../audit";
import { daysLate } from "../format";
import { NOTIFICATION_TEXTS, notifyReader } from "../notifications";
import { prisma } from "../prisma";
import { assertReader, ReaderAuthError } from "../reader-auth";
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
 * Lo dispara el personal desde el panel de préstamos.
 */
export async function sendOverdueRemindersAction(): Promise<ActionState> {
  let user;
  try {
    user = await assertUser();
  } catch (error) {
    if (error instanceof AuthError) return UNAUTHORIZED;
    throw error;
  }

  const now = new Date();
  const overdue = await prisma.loan.findMany({
    where: { returnedAt: null, dueAt: { lt: now } },
    include: {
      book: { select: { title: true } },
      reader: { select: { id: true, fullName: true, email: true } },
    },
    orderBy: { dueAt: "asc" },
  });

  let sent = 0;
  let withoutEmail = 0;
  for (const loan of overdue) {
    if (!loan.reader.email) {
      withoutEmail += 1;
      continue;
    }
    const days = daysLate(loan.dueAt, now);
    const texts = NOTIFICATION_TEXTS.overdue({
      name: loan.reader.fullName,
      title: loan.book.title,
      dueAt: loan.dueAt,
      days,
    });
    await notifyReader({
      reader: loan.reader,
      kind: "overdue",
      subject: texts.subject,
      body: texts.body,
    });
    sent += 1;
  }

  await recordAudit({
    action: "NOTIFICATION_OVERDUE_REMINDERS",
    entityType: "Notification",
    entityId: null,
    summary: `Avisos de retraso enviados a ${sent} persona(s)`,
    userId: user.id,
  });

  revalidatePath("/panel/prestamos");
  revalidatePath("/panel/tareas");

  return {
    status: "success",
    message: "actions.overdueRemindersSent",
    messageParams: { sent, withoutEmail },
  };
}
