"use server";

import { revalidatePath } from "next/cache";

import {
  assertManager,
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
  message: "actions.ownerOnly",
};

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function createUserAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let manager;
  try {
    manager = await assertManager();
  } catch (error) {
    if (error instanceof AuthError) return FORBIDDEN;
    throw error;
  }

  const parsed = createUserSchema.safeParse({
    username: text(formData, "username"),
    displayName: text(formData, "displayName"),
    password: text(formData, "password"),
    role: text(formData, "role"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "actions.reviewFields",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const existing = await prisma.user.findUnique({
    where: { username: parsed.data.username },
  });
  if (existing) {
    return {
      status: "error",
      fieldErrors: { username: "actions.usernameTaken" },
    };
  }

  const created = await prisma.user.create({
    data: {
      username: parsed.data.username,
      displayName: parsed.data.displayName,
      passwordHash: await hashPassword(parsed.data.password),
      role: parsed.data.role,
      active: true,
      mustChangePassword: true,
      createdById: manager.id,
    },
  });

  await recordAudit({
    action: "USER_CREATE",
    entityType: "User",
    entityId: created.id,
    summary: `Creada la cuenta «${created.username}» para ${created.displayName}`,
    userId: manager.id,
  });

  revalidatePath("/panel/usuarios");
  revalidatePath("/panel");
  return {
    status: "success",
    message: "actions.userCreated",
    messageParams: { username: created.username },
  };
}

export async function setUserActiveAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let manager;
  try {
    manager = await assertManager();
  } catch (error) {
    if (error instanceof AuthError) return FORBIDDEN;
    throw error;
  }

  const userId = text(formData, "userId");
  const active = text(formData, "active") === "true";
  if (!userId) return { status: "error", message: "actions.userNoId" };
  if (userId === manager.id && !active) {
    return { status: "error", message: "actions.userCantDisableSelf" };
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { status: "error", message: "actions.userGone" };

  await prisma.user.update({ where: { id: userId }, data: { active } });
  if (!active) await revokeUserSessions(userId);

  await recordAudit({
    action: active ? "USER_ACTIVATE" : "USER_DEACTIVATE",
    entityType: "User",
    entityId: userId,
    summary: `${active ? "Activada" : "Desactivada"} la cuenta «${target.username}»`,
    userId: manager.id,
  });

  revalidatePath("/panel/usuarios");
  return {
    status: "success",
    message: active ? "actions.userActivated" : "actions.userDeactivated",
    messageParams: { username: target.username },
  };
}

export async function resetUserPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let manager;
  try {
    manager = await assertManager();
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
  if (!target) return { status: "error", message: "actions.userGone" };

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
    userId: manager.id,
  });

  revalidatePath("/panel/usuarios");
  return {
    status: "success",
    message: "actions.userPasswordReset",
    messageParams: { username: target.username },
  };
}

export async function deleteUserAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let manager;
  try {
    manager = await assertManager();
  } catch (error) {
    if (error instanceof AuthError) return FORBIDDEN;
    throw error;
  }

  const userId = text(formData, "userId");
  if (!userId) return { status: "error", message: "actions.userNoId" };
  if (userId === manager.id) {
    return { status: "error", message: "actions.userCantDeleteSelf" };
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { status: "error", message: "actions.userGone" };
  if (target.role === "OWNER") {
    return { status: "error", message: "actions.userCantDeleteOwner" };
  }

  await prisma.user.delete({ where: { id: userId } });
  await recordAudit({
    action: "USER_DELETE",
    entityType: "User",
    entityId: userId,
    summary: `Eliminada la cuenta «${target.username}»`,
    userId: manager.id,
  });

  revalidatePath("/panel/usuarios");
  revalidatePath("/panel");
  return {
    status: "success",
    message: "actions.userDeleted",
    messageParams: { username: target.username },
  };
}
