"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { assertUser, AuthError } from "../auth";
import { recordAudit } from "../audit";
import { addSuspensionDuration, PERMANENT_SUSPENSION_DATE } from "../format";
import { prisma } from "../prisma";
import { revokeReaderSessions } from "../reader-auth";
import { CARD_PREFIX, nextCardNumber } from "../reader-card";
import {
  fieldErrors,
  readerSchema,
  suspensionSchema,
  type ActionState,
} from "../validation";

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
  // La bandeja de tareas lista sanciones caducadas: hay que refrescarla al
  // levantar o crear una suspensión.
  revalidatePath("/panel/tareas");
  if (readerId) revalidatePath(`/panel/lectores/${readerId}`);
}

/**
 * Calcula el siguiente número de carné libre siguiendo la nomenclatura del
 * centro (`INSARAN-0001`). Lo usa el botón «Generar» del formulario de lectores
 * para no tener que inventar el número a mano.
 *
 * La unicidad definitiva la garantiza la restricción de la base de datos: si
 * dos personas generan el mismo número a la vez, la segunda verá el aviso de
 * carné repetido al guardar.
 */
export async function generateReaderCardNumberAction(): Promise<string> {
  await assertUser();

  const readers = await prisma.reader.findMany({
    where: { cardNumber: { startsWith: `${CARD_PREFIX}-` } },
    select: { cardNumber: true },
  });

  return nextCardNumber(readers.map((reader) => reader.cardNumber));
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
 * retrasos u otras incidencias).
 *
 * La duración la decide el personal: una cantidad con su unidad (minutos,
 * horas, días, semanas o meses) o `permanent` para una sanción sin caducidad.
 * El campo `lift` levanta la suspensión vigente.
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

  const readerId = text(formData, "readerId");
  if (!readerId) {
    return { status: "error", message: "actions.suspensionReview" };
  }

  const reader = await prisma.reader.findUnique({ where: { id: readerId } });
  if (!reader) return { status: "error", message: "actions.readerGone" };

  // Levantar la suspensión vigente.
  if (text(formData, "lift") === "1") {
    await prisma.reader.update({
      where: { id: reader.id },
      data: { suspendedUntil: null, suspensionReason: null },
    });
    await recordAudit({
      action: "READER_SUSPEND_LIFT",
      entityType: "Reader",
      entityId: reader.id,
      summary: `Levantada la suspensión de «${reader.fullName}»`,
      userId: user.id,
    });
    revalidateReaders(reader.id);
    return { status: "success", message: "actions.suspensionLifted" };
  }

  const parsed = suspensionSchema.safeParse({
    readerId,
    permanent: text(formData, "permanent") === "1" ? "1" : undefined,
    amount: text(formData, "amount"),
    unit: text(formData, "unit"),
    reason: text(formData, "reason"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "actions.suspensionReview",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const permanent = parsed.data.permanent === "1";
  const amount =
    !permanent && parsed.data.amount
      ? Number.parseInt(parsed.data.amount, 10)
      : 0;
  if (!permanent && (!Number.isFinite(amount) || amount <= 0)) {
    return {
      status: "error",
      message: "actions.suspensionReview",
      fieldErrors: { amount: "validation.suspensionAmountRequired" },
    };
  }

  const suspendedUntil = permanent
    ? PERMANENT_SUSPENSION_DATE
    : addSuspensionDuration(new Date(), amount, parsed.data.unit!);

  await prisma.reader.update({
    where: { id: reader.id },
    data: {
      suspendedUntil,
      suspensionReason: parsed.data.reason ?? null,
    },
  });

  await recordAudit({
    action: "READER_SUSPEND",
    entityType: "Reader",
    entityId: reader.id,
    summary: permanent
      ? `Suspendido el préstamo a «${reader.fullName}» de forma permanente`
      : `Suspendido el préstamo a «${reader.fullName}» ${amount} ${
          parsed.data.unit
        } (hasta el ${suspendedUntil.toISOString().slice(0, 10)})`,
    userId: user.id,
  });

  revalidateReaders(reader.id);
  return { status: "success", message: "actions.suspensionSaved" };
}

/**
 * Restablece el PIN de acceso a «Mi biblioteca»: el lector o la lectora
 * vuelve al PIN inicial y deberá elegir el suyo en el próximo acceso.
 * Las sesiones abiertas se revocan al instante.
 */
export async function resetReaderPinAction(
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

  const readerId = text(formData, "readerId");
  if (!readerId) {
    return { status: "error", message: "actions.readerNoId" };
  }

  const reader = await prisma.reader.findUnique({ where: { id: readerId } });
  if (!reader) return { status: "error", message: "actions.readerGone" };

  await prisma.reader.update({
    where: { id: reader.id },
    data: { pinHash: null, pinMustChange: true },
  });
  await revokeReaderSessions(reader.id);
  await recordAudit({
    action: "READER_PIN_RESET",
    entityType: "Reader",
    entityId: reader.id,
    summary: `Restablecido el PIN de «Mi biblioteca» de ${reader.fullName}`,
    userId: user.id,
  });

  revalidateReaders(reader.id);
  revalidatePath("/mi-biblioteca");
  return { status: "success", message: "actions.readerPinReset" };
}
