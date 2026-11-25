"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { assertUser, AuthError } from "../auth";
import { recordAudit } from "../audit";
import { prisma } from "../prisma";
import {
  digitalResourceSchema,
  fieldErrors,
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

function revalidateDigitalResources(id?: string) {
  revalidatePath("/");
  revalidatePath("/recursos-digitales");
  revalidatePath("/panel/recursos-digitales");
  if (id) revalidatePath(`/panel/recursos-digitales/${id}/editar`);
}

function readDigitalResource(formData: FormData) {
  return digitalResourceSchema.safeParse({
    title: text(formData, "title"),
    author: text(formData, "author"),
    type: text(formData, "type"),
    url: text(formData, "url"),
    description: text(formData, "description"),
    language: text(formData, "language"),
  });
}

export async function createDigitalResourceAction(
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

  const parsed = readDigitalResource(formData);
  if (!parsed.success) {
    return {
      status: "error",
      message: "actions.reviewFieldsBeforeSave",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const resource = await prisma.digitalResource.create({
    data: { ...parsed.data, createdById: user.id },
  });
  await recordAudit({
    action: "DIGITAL_RESOURCE_CREATE",
    entityType: "DigitalResource",
    entityId: resource.id,
    summary: `Recurso digital añadido: «${resource.title}»`,
    userId: user.id,
  });

  revalidateDigitalResources();
  redirect("/panel/recursos-digitales?aviso=creado");
}

export async function updateDigitalResourceAction(
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

  const id = text(formData, "id").trim();
  if (!id) return { status: "error", message: "actions.digitalResourceNoIdEdit" };

  const parsed = readDigitalResource(formData);
  if (!parsed.success) {
    return {
      status: "error",
      message: "actions.reviewFieldsBeforeSave",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const existing = await prisma.digitalResource.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return { status: "error", message: "actions.digitalResourceGone" };

  const resource = await prisma.digitalResource.update({
    where: { id },
    data: parsed.data,
  });
  await recordAudit({
    action: "DIGITAL_RESOURCE_UPDATE",
    entityType: "DigitalResource",
    entityId: resource.id,
    summary: `Recurso digital editado: «${resource.title}»`,
    userId: user.id,
  });

  revalidateDigitalResources(id);
  redirect("/panel/recursos-digitales?aviso=guardado");
}

export async function deleteDigitalResourceAction(
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

  const id = text(formData, "id").trim();
  if (!id) return { status: "error", message: "actions.digitalResourceNoIdDelete" };

  const resource = await prisma.digitalResource.findUnique({ where: { id } });
  if (!resource) return { status: "error", message: "actions.digitalResourceGone" };

  await prisma.digitalResource.delete({ where: { id } });
  await recordAudit({
    action: "DIGITAL_RESOURCE_DELETE",
    entityType: "DigitalResource",
    entityId: resource.id,
    summary: `Recurso digital eliminado: «${resource.title}»`,
    userId: user.id,
  });

  revalidateDigitalResources(id);
  return { status: "success", message: "actions.digitalResourceDeleted" };
}