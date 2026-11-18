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
import { decryptTwoFactorSecret, verifySecondFactor } from "../two-factor";
import {
  clearPendingTwoFactorLogin,
  readPendingTwoFactorLogin,
  setPendingTwoFactorLogin,
} from "../two-factor-cookie";
import {
  changePasswordSchema,
  fieldErrors,
  loginSchema,
  twoFactorCodeSchema,
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

  // Si la cuenta tiene verificación en dos pasos, no se crea la sesión todavía:
  // se guarda una cookie temporal y el formulario pide el segundo factor.
  if (user.twoFactorEnabled && user.twoFactorSecret) {
    await setPendingTwoFactorLogin("staff", user.id);
    return { status: "idle", twoFactorRequired: true };
  }

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

/**
 * Segundo paso del acceso del personal: código TOTP o código de recuperación.
 * Solo aquí se crea la sesión real.
 */
export async function loginTwoFactorAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const pending = await readPendingTwoFactorLogin("staff");
  if (!pending) {
    return { status: "error", message: "twoFactor.expiredLogin" };
  }

  const parsed = twoFactorCodeSchema.safeParse({
    code: formData.get("code"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "actions.reviewData",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const key = await clientKey("login-2fa");
  const limit = checkRateLimit(key);
  if (!limit.allowed) {
    const minutes = Math.max(1, Math.ceil(limit.retryAfterSeconds / 60));
    return {
      status: "error",
      message: "actions.tooManyAttempts",
      messageParams: { minutes },
    };
  }

  const user = await prisma.user.findUnique({ where: { id: pending.id } });
  if (!user || !user.active || !user.twoFactorEnabled || !user.twoFactorSecret) {
    await clearPendingTwoFactorLogin("staff");
    return { status: "error", message: "twoFactor.expiredLogin" };
  }

  const secret = decryptTwoFactorSecret(user.twoFactorSecret);
  if (!secret) {
    return { status: "error", message: "twoFactor.configurationError" };
  }

  const result = verifySecondFactor({
    secret,
    recoveryCodeHashes: user.twoFactorRecoveryCodes,
    code: parsed.data.code,
  });
  if (!result.valid) {
    return { status: "error", message: "twoFactor.invalidCode" };
  }

  if (result.usedRecoveryCode) {
    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorRecoveryCodes: result.remainingRecoveryCodes },
    });
    await recordAudit({
      action: "TWO_FACTOR_RECOVERY_USED",
      entityType: "User",
      entityId: user.id,
      summary: `${user.displayName} ha usado un código de recuperación`,
      userId: user.id,
    });
  }

  resetRateLimit(key);
  await clearPendingTwoFactorLogin("staff");
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });
  await createSession(user.id, user.role);
  await recordAudit({
    action: "AUTH_LOGIN",
    entityType: "User",
    entityId: user.id,
    summary: `${user.displayName} ha iniciado sesión con verificación en dos pasos`,
    userId: user.id,
  });

  redirect(safeNext(formData.get("next")));
}

/** Cancela el segundo paso y vuelve al formulario de acceso. */
export async function cancelTwoFactorLoginAction(): Promise<void> {
  await clearPendingTwoFactorLogin("staff");
  redirect("/login");
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
