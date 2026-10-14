"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { assertUser, AuthError } from "../auth";
import { recordAudit } from "../audit";
import { prisma } from "../prisma";
import { fieldErrors, readerSchema, type ActionState } from "../validation";

const UNAUTHORIZED: ActionState = {
  status: "error",
  message: "Tu sesión ha caducado. Vuelve a iniciar sesión.",
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
      message: "Revisa los campos marcados antes de guardar.",
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
        message: "Ya hay un lector o lectora con ese número de carné.",
        fieldErrors: { cardNumber: "Este carné ya está en uso." },
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
    return { status: "error", message: "No se ha indicado qué lector editar." };
  }

  const parsed = readReader(formData);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisa los campos marcados antes de guardar.",
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
        message: "Ya hay un lector o lectora con ese número de carné.",
        fieldErrors: { cardNumber: "Este carné ya está en uso." },
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
    return { status: "error", message: "No se ha indicado qué lector." };
  }

  const reader = await prisma.reader.findUnique({ where: { id: readerId } });
  if (!reader) return { status: "error", message: "Ese lector ya no existe." };

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
    message: active ? "Lector activado." : "Lector desactivado.",
  };
}
