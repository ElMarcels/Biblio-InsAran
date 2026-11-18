"use server";

import { redirect } from "next/navigation";

import { recordAudit } from "../audit";
import {
  checkReaderPin,
  createReaderSession,
  destroyReaderSession,
  getCurrentReader,
  hashPin,
} from "../reader-auth";
import { prisma } from "../prisma";
import { checkRateLimit, clientKey, resetRateLimit } from "../rate-limit";
import { decryptTwoFactorSecret, verifySecondFactor } from "../two-factor";
import {
  clearPendingTwoFactorLogin,
  readPendingTwoFactorLogin,
  setPendingTwoFactorLogin,
} from "../two-factor-cookie";
import {
  changeReaderPinSchema,
  fieldErrors,
  readerLoginSchema,
  twoFactorCodeSchema,
  type ActionState,
} from "../validation";

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

/** Evita redirecciones abiertas: solo rutas dentro del área del lector/a. */
function safeReaderNext(value: FormDataEntryValue | null): string {
  const path = typeof value === "string" ? value : "";
  if (path.startsWith("/mi-biblioteca/") && !path.startsWith("//")) return path;
  return "/mi-biblioteca/prestamos";
}

/**
 * Acceso al área del lector/a con número de carné y PIN.
 *
 * Si todavía no ha elegido PIN propio, se acepta el PIN inicial compartido y
 * la página siguiente obligará a cambiarlo antes de continuar.
 */
export async function readerLoginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = readerLoginSchema.safeParse({
    cardNumber: text(formData, "cardNumber"),
    pin: text(formData, "pin"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "actions.reviewData",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const key = await clientKey("reader-login");
  const limit = checkRateLimit(key);
  if (!limit.allowed) {
    const minutes = Math.max(1, Math.ceil(limit.retryAfterSeconds / 60));
    return {
      status: "error",
      message: "actions.tooManyAttempts",
      messageParams: { minutes },
    };
  }

  const cardNumber = parsed.data.cardNumber.toLocaleUpperCase("es");
  const reader = await prisma.reader.findUnique({ where: { cardNumber } });

  // Si el carné no existe, se responde igualmente con un pequeño retardo
  // constante para no revelar qué carnés están registrados.
  if (!reader) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    return { status: "error", message: "actions.readerInvalidCredentials" };
  }

  const valid = await checkReaderPin(reader, parsed.data.pin);
  if (!valid) {
    return { status: "error", message: "actions.readerInvalidCredentials" };
  }
  if (!reader.active) {
    return { status: "error", message: "actions.readerInactive" };
  }

  resetRateLimit(key);

  // Verificación en dos pasos: la sesión de «Mi biblioteca» se crea solo
  // después de validar el código.
  if (reader.twoFactorEnabled && reader.twoFactorSecret) {
    await setPendingTwoFactorLogin("reader", reader.id);
    return { status: "idle", twoFactorRequired: true };
  }

  await prisma.reader.update({
    where: { id: reader.id },
    data: { lastReaderLoginAt: new Date() },
  });
  await createReaderSession(reader.id);
  await recordAudit({
    action: "READER_LOGIN",
    entityType: "Reader",
    entityId: reader.id,
    summary: `${reader.fullName} ha iniciado sesión en «Mi biblioteca»`,
  });

  redirect(safeReaderNext(formData.get("next")));
}

/**
 * Segundo paso del acceso a «Mi biblioteca»: código TOTP o de recuperación.
 */
export async function readerLoginTwoFactorAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const pending = await readPendingTwoFactorLogin("reader");
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

  const key = await clientKey("reader-login-2fa");
  const limit = checkRateLimit(key);
  if (!limit.allowed) {
    const minutes = Math.max(1, Math.ceil(limit.retryAfterSeconds / 60));
    return {
      status: "error",
      message: "actions.tooManyAttempts",
      messageParams: { minutes },
    };
  }

  const reader = await prisma.reader.findUnique({ where: { id: pending.id } });
  if (
    !reader ||
    !reader.active ||
    !reader.twoFactorEnabled ||
    !reader.twoFactorSecret
  ) {
    await clearPendingTwoFactorLogin("reader");
    return { status: "error", message: "twoFactor.expiredLogin" };
  }

  const secret = decryptTwoFactorSecret(reader.twoFactorSecret);
  if (!secret) {
    return { status: "error", message: "twoFactor.configurationError" };
  }

  const result = verifySecondFactor({
    secret,
    recoveryCodeHashes: reader.twoFactorRecoveryCodes,
    code: parsed.data.code,
  });
  if (!result.valid) {
    return { status: "error", message: "twoFactor.invalidCode" };
  }

  if (result.usedRecoveryCode) {
    await prisma.reader.update({
      where: { id: reader.id },
      data: { twoFactorRecoveryCodes: result.remainingRecoveryCodes },
    });
    await recordAudit({
      action: "TWO_FACTOR_RECOVERY_USED",
      entityType: "Reader",
      entityId: reader.id,
      summary: `${reader.fullName} ha usado un código de recuperación en «Mi biblioteca»`,
    });
  }

  resetRateLimit(key);
  await clearPendingTwoFactorLogin("reader");
  await prisma.reader.update({
    where: { id: reader.id },
    data: { lastReaderLoginAt: new Date() },
  });
  await createReaderSession(reader.id);
  await recordAudit({
    action: "READER_LOGIN",
    entityType: "Reader",
    entityId: reader.id,
    summary: `${reader.fullName} ha iniciado sesión en «Mi biblioteca» con verificación en dos pasos`,
  });

  redirect(safeReaderNext(formData.get("next")));
}

/** Cancela el segundo paso y vuelve al acceso de «Mi biblioteca». */
export async function cancelReaderTwoFactorLoginAction(): Promise<void> {
  await clearPendingTwoFactorLogin("reader");
  redirect("/mi-biblioteca");
}

/** Cierra la sesión del lector/a. */
export async function readerLogoutAction(): Promise<void> {
  const reader = await getCurrentReader();
  if (reader) {
    await recordAudit({
      action: "READER_LOGOUT",
      entityType: "Reader",
      entityId: reader.id,
      summary: `${reader.fullName} ha cerrado sesión en «Mi biblioteca»`,
    });
  }
  await destroyReaderSession();
  redirect("/mi-biblioteca");
}

/**
 * Cambia el propio PIN desde «Mi biblioteca».
 *
 * En el primer acceso (`forced`) no se pide el PIN actual: la sesión acaba de
 * validarlo con el PIN inicial. Después, el PIN vigente es obligatorio.
 */
export async function changeOwnReaderPinAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getCurrentReader();
  if (!session) {
    return { status: "error", message: "actions.sessionExpiredShort" };
  }

  const parsed = changeReaderPinSchema.safeParse({
    currentPin: text(formData, "currentPin") || undefined,
    newPin: text(formData, "newPin"),
    confirmPin: text(formData, "confirmPin"),
    forced: text(formData, "forced") === "1" ? "1" : undefined,
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "actions.reviewFields",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const reader = await prisma.reader.findUnique({
    where: { id: session.id },
  });
  if (!reader) {
    return { status: "error", message: "actions.readerGone" };
  }

  const forced = parsed.data.forced === "1" || reader.pinMustChange;
  if (!forced) {
    const currentValid =
      reader.pinHash !== null &&
      (await checkReaderPin(reader, parsed.data.currentPin ?? ""));
    if (!currentValid) {
      return {
        status: "error",
        fieldErrors: { currentPin: "actions.currentPinWrong" },
      };
    }
  }

  await prisma.reader.update({
    where: { id: reader.id },
    data: {
      pinHash: await hashPin(parsed.data.newPin),
      pinMustChange: false,
    },
  });
  await recordAudit({
    action: "READER_PIN_CHANGE",
    entityType: "Reader",
    entityId: reader.id,
    summary: `${reader.fullName} ha cambiado su PIN de «Mi biblioteca»`,
  });

  redirect("/mi-biblioteca/prestamos?aviso=pin");
}
