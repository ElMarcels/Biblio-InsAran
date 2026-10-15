"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { assertUser, AuthError } from "../auth";
import { recordAudit } from "../audit";
import { prisma } from "../prisma";
import { fieldErrors, parseDateInput, readerSchema, suspensionSchema, type ActionState } from "../validation";

const UNAUTHORIZED: ActionState = {
  status: "error",
  message: "actions.sessionExpired",
};

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function readReader(formData: FormData) {
  return readerSchema.safeParse({
    fullName: text(formData, "fullName"),
    cardNumber: text(formData, "cardNumber"),
    groupName: text(formData, "groupName"),
    email: text(formData, "email"),
    phone: text(formData, "phone"),
    notes: text(formData, "notes"),
  });
}

function isUniqueError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

function revalidateReaders(readerId?: string) {
  revalidatePath("/panel");
  revalidatePath("/panel/lectores");
  revalidatePath("/panel/prestamos");
  revalidatePath("/panel/reservas");
  if (readerId) revalidatePath(`/panel/lectores/${readerId}`);
}

export async function createReaderAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await assertUser();
  } catch (error) {
    if (error instanceof AuthError) return UNAUTHORIZED;
    throw error;
  }

  const parsed = readReader(formData);
  if (!parsed.success) {
    return {
      status: "error",
      message: "actions.reviewFieldsBeforeSave",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  try {
    const reader = await prisma.reader.create({ data: parsed.data });
    await recordAudit({
      action: "READER_CREATE",
      entityType: "Reader",
      entityId: reader.id,
      summary: `Alta del lector/a «${reader.fullName}»`,
    });
  } catch (error) {
    if (isUniqueError(error)) {
      return {
        status: "error",
        message: "actions.readerCardTaken",
        fieldErrors: { cardNumber: "actions.readerCardInUse" },
      };
    }
    throw error;
  }

  revalidateReaders();
  redirect("/panel/lectores?aviso=creado");
}

export async function updateReaderAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await assertUser();
  } catch (error) {
    if (error instanceof AuthError) return UNAUTHORIZED;
    throw error;
  }

  const readerId = text(formData, "id");
  if (!readerId) {
    return { status: "error", message: "actions.readerNoIdEdit" };
  }

  const parsed = readReader(formData);
  if (!parsed.success) {
    return {
      status: "error",
      message: "actions.reviewFieldsBeforeSave",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  try {
    await prisma.reader.update({ where: { id: readerId }, data: parsed.data });
    await recordAudit({
      action: "READER_UPDATE",
      entityType: "Reader",
      entityId: readerId,
      summary: `Editado el lector/a «${parsed.data.fullName}»`,
    });
  } catch (error) {
    if (isUniqueError(error)) {
      return {
        status: "error",
        message: "actions.readerCardTaken",
        fieldErrors: { cardNumber: "actions.readerCardInUse" },
      };
    }
    throw error;
  }

  revalidateReaders(readerId);
  redirect(`/panel/lectores/${readerId}?aviso=editado`);
}

/** Activa o desactiva un lector (no se borra: conserva su historial). */
export async function setReaderActiveAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await assertUser();
  } catch (error) {
    if (error instanceof AuthError) return UNAUTHORIZED;
    throw error;
  }

  const readerId = text(formData, "id");
  const active = text(formData, "active") === "1";
  if (!readerId) {
    return { status: "error", message: "actions.readerNoId" };
  }

  const reader = await prisma.reader.findUnique({ where: { id: readerId } });
  if (!reader) return { status: "error", message: "actions.readerGone" };

  await prisma.reader.update({ where: { id: readerId }, data: { active } });
  await recordAudit({
    action: active ? "READER_ACTIVATE" : "READER_DEACTIVATE",
    entityType: "Reader",
    entityId: readerId,
    summary: `${active ? "Activado" : "Desactivado"} el lector/a «${reader.fullName}»`,
  });

  revalidateReaders(readerId);
  return {
    status: "success",
    message: active ? "actions.readerActivated" : "actions.readerDeactivated",
  };
}

/**
 * Suspende o levanta la suspensión del préstamo a un lector (sanción por
 * retrasos u otras incidencias). Si se envía una fecha, la suspensión dura
 * hasta ese día; si se deja vacía, se levanta.
 */
export async function setReaderSuspensionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let user;
  try {
    user = await assertUser();
  } catch (error) {
    if (error instanceof AuthError) return UNAUTHORIZED;
    throw error;
  }

  const parsed = suspensionSchema.safeParse({
    readerId: text(formData, "readerId"),
    until: text(formData, "until"),
    reason: text(formData, "reason"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "actions.suspensionReview",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const reader = await prisma.reader.findUnique({
    where: { id: parsed.data.readerId },
  });
  if (!reader) return { status: "error", message: "actions.readerGone" };

  let suspendedUntil: Date | null = null;
  if (parsed.data.until) {
    suspendedUntil = parseDateInput(parsed.data.until);
    if (!suspendedUntil) {
      return {
        status: "error",
        message: "actions.suspensionInvalidDate",
        fieldErrors: { until: "actions.suspensionDateFieldInvalid" },
      };
    }
    if (suspendedUntil.getTime() <= Date.now()) {
      return {
        status: "error",
        message: "actions.suspensionFutureDate",
        fieldErrors: { until: "actions.suspensionFutureFieldInvalid" },
      };
    }
  }

  await prisma.reader.update({
    where: { id: reader.id },
    data: {
      suspendedUntil,
      suspensionReason: suspendedUntil ? (parsed.data.reason ?? null) : null,
    },
  });

  await recordAudit({
    action: suspendedUntil ? "READER_SUSPEND" : "READER_SUSPEND_LIFT",
    entityType: "Reader",
    entityId: reader.id,
    summary: suspendedUntil
      ? `Suspendido el préstamo a «${reader.fullName}» hasta el ${suspendedUntil
          .toISOString()
          .slice(0, 10)}`
      : `Levantada la suspensión de «${reader.fullName}»`,
    userId: user.id,
  });

  revalidateReaders(reader.id);
  return {
    status: "success",
    message: suspendedUntil
      ? "actions.suspensionSaved"
      : "actions.suspensionLifted",
  };
}
