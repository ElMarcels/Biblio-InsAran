"use server";

import { revalidatePath } from "next/cache";

import {
  assertOwner,
  AuthError,
  hashPassword,
  revokeUserSessions,
} from "../auth";
import { recordAudit } from "../audit";
import { prisma } from "../prisma";
import {
  createUserSchema,
  fieldErrors,
  resetPasswordSchema,
  type ActionState,
} from "../validation";

const FORBIDDEN: ActionState = {
  status: "error",
  message: "Solo el dueño de la plataforma puede gestionar usuarios.",
};

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function createUserAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let owner;
  try {
    owner = await assertOwner();
  } catch (error) {
    if (error instanceof AuthError) return FORBIDDEN;
    throw error;
  }

  const parsed = createUserSchema.safeParse({
    username: text(formData, "username"),
    displayName: text(formData, "displayName"),
    password: text(formData, "password"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisa los campos marcados.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const existing = await prisma.user.findUnique({
    where: { username: parsed.data.username },
  });
  if (existing) {
    return {
      status: "error",
      fieldErrors: { username: "Ese nombre de usuario ya está en uso." },
    };
  }

  const created = await prisma.user.create({
    data: {
      username: parsed.data.username,
      displayName: parsed.data.displayName,
      passwordHash: await hashPassword(parsed.data.password),
      role: "EDITOR",
      active: true,
      mustChangePassword: true,
      createdById: owner.id,
    },
  });

  await recordAudit({
    action: "USER_CREATE",
    entityType: "User",
    entityId: created.id,
    summary: `Creada la cuenta «${created.username}» para ${created.displayName}`,
    userId: owner.id,
  });

  revalidatePath("/panel/usuarios");
  revalidatePath("/panel");
  return {
    status: "success",
    message: `Cuenta «${created.username}» creada. La persona deberá cambiar la contraseña al entrar.`,
  };
}

export async function setUserActiveAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let owner;
  try {
    owner = await assertOwner();
  } catch (error) {
    if (error instanceof AuthError) return FORBIDDEN;
    throw error;
  }

  const userId = text(formData, "userId");
  const active = text(formData, "active") === "true";
  if (!userId) return { status: "error", message: "Usuario no indicado." };
  if (userId === owner.id && !active) {
    return { status: "error", message: "No puedes desactivar tu propia cuenta." };
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { status: "error", message: "El usuario ya no existe." };

  await prisma.user.update({ where: { id: userId }, data: { active } });
  if (!active) await revokeUserSessions(userId);

  await recordAudit({
    action: active ? "USER_ACTIVATE" : "USER_DEACTIVATE",
    entityType: "User",
    entityId: userId,
    summary: `${active ? "Activada" : "Desactivada"} la cuenta «${target.username}»`,
    userId: owner.id,
  });

  revalidatePath("/panel/usuarios");
  return {
    status: "success",
    message: `Cuenta «${target.username}» ${active ? "activada" : "desactivada"}.`,
  };
}

export async function resetUserPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let owner;
  try {
    owner = await assertOwner();
  } catch (error) {
    if (error instanceof AuthError) return FORBIDDEN;
    throw error;
  }

  const parsed = resetPasswordSchema.safeParse({
    userId: text(formData, "userId"),
    newPassword: text(formData, "newPassword"),
  });
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrors(parsed.error) };
  }

  const target = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
  if (!target) return { status: "error", message: "El usuario ya no existe." };

  await prisma.user.update({
    where: { id: target.id },
    data: {
      passwordHash: await hashPassword(parsed.data.newPassword),
      mustChangePassword: true,
    },
  });
  await revokeUserSessions(target.id);

  await recordAudit({
    action: "USER_PASSWORD_RESET",
    entityType: "User",
    entityId: target.id,
    summary: `Restablecida la contraseña de «${target.username}»`,
    userId: owner.id,
  });

  revalidatePath("/panel/usuarios");
  return {
    status: "success",
    message: `Nueva contraseña asignada a «${target.username}». Deberá cambiarla al entrar.`,
  };
}

export async function deleteUserAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let owner;
  try {
    owner = await assertOwner();
  } catch (error) {
    if (error instanceof AuthError) return FORBIDDEN;
    throw error;
  }

  const userId = text(formData, "userId");
  if (!userId) return { status: "error", message: "Usuario no indicado." };
  if (userId === owner.id) {
    return { status: "error", message: "No puedes eliminar tu propia cuenta." };
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { status: "error", message: "El usuario ya no existe." };
  if (target.role === "OWNER") {
    return { status: "error", message: "No se puede eliminar una cuenta de dueño." };
  }

  await prisma.user.delete({ where: { id: userId } });
  await recordAudit({
    action: "USER_DELETE",
    entityType: "User",
    entityId: userId,
    summary: `Eliminada la cuenta «${target.username}»`,
    userId: owner.id,
  });

  revalidatePath("/panel/usuarios");
  revalidatePath("/panel");
  return { status: "success", message: `Cuenta «${target.username}» eliminada.` };
}
