"use server";

import { redirect } from "next/navigation";
import { prisma } from "../prisma";
import {
  createSession,
  destroyCurrentSession,
  getCurrentUser,
  hashPassword,
  verifyPassword,
} from "../auth";
import { recordAudit } from "../audit";
import { checkRateLimit, clientKey, resetRateLimit } from "../rate-limit";
import {
  changePasswordSchema,
  fieldErrors,
  loginSchema,
  type ActionState,
} from "../validation";

/** Evita redirecciones abiertas: solo rutas internas. */
function safeNext(value: FormDataEntryValue | null): string {
  const path = typeof value === "string" ? value : "";
  if (path.startsWith("/") && !path.startsWith("//")) return path;
  return "/panel";
}

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "actions.reviewData",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const key = await clientKey("login");
  const limit = checkRateLimit(key);
  if (!limit.allowed) {
    const minutes = Math.max(1, Math.ceil(limit.retryAfterSeconds / 60));
    return {
      status: "error",
      message: "actions.tooManyAttempts",
      messageParams: { minutes },
    };
  }

  const user = await prisma.user.findUnique({
    where: { username: parsed.data.username },
  });

  // Si el usuario no existe, se responde igualmente con un pequeño retardo
  // constante para no revelar qué nombres de usuario están registrados.
  if (!user) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    return { status: "error", message: "actions.invalidCredentials" };
  }

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) {
    return { status: "error", message: "actions.invalidCredentials" };
  }
  if (!user.active) {
    return {
      status: "error",
      message: "actions.accountDisabled",
    };
  }

  resetRateLimit(key);
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });
  await createSession(user.id, user.role);
  await recordAudit({
    action: "AUTH_LOGIN",
    entityType: "User",
    entityId: user.id,
    summary: `${user.displayName} ha iniciado sesión`,
    userId: user.id,
  });

  redirect(safeNext(formData.get("next")));
}

export async function logoutAction(): Promise<void> {
  const user = await getCurrentUser();
  if (user) {
    await recordAudit({
      action: "AUTH_LOGOUT",
      entityType: "User",
      entityId: user.id,
      summary: `${user.displayName} ha cerrado sesión`,
      userId: user.id,
    });
  }
  await destroyCurrentSession();
  redirect("/");
}

export async function changeOwnPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) {
    return { status: "error", message: "actions.sessionExpiredShort" };
  }

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "actions.reviewFields",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const account = await prisma.user.findUnique({ where: { id: user.id } });
  if (!account) {
    return { status: "error", message: "actions.accountNotFound" };
  }

  const valid = await verifyPassword(parsed.data.currentPassword, account.passwordHash);
  if (!valid) {
    return {
      status: "error",
      fieldErrors: { currentPassword: "actions.currentPasswordWrong" },
    };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(parsed.data.newPassword),
      mustChangePassword: false,
    },
  });
  await recordAudit({
    action: "USER_PASSWORD_RESET",
    entityType: "User",
    entityId: user.id,
    summary: `${user.displayName} ha cambiado su contraseña`,
    userId: user.id,
  });

  return { status: "success", message: "actions.passwordUpdated" };
}
