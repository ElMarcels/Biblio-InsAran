"use server";

import { revalidatePath } from "next/cache";

import { recordAudit } from "../audit";
import { assertReader, checkReaderPin } from "../reader-auth";
import { assertUser, verifyPassword } from "../auth";
import { prisma } from "../prisma";
import {
  decryptTwoFactorSecret,
  encryptTwoFactorSecret,
  generateRecoveryCodes,
  generateTotpSecret,
  hashRecoveryCode,
  buildTotpUrl,
  RECOVERY_CODE_COUNT,
  totpQrDataUrl,
  TWO_FACTOR_PENDING_TTL_MS,
  verifySecondFactor,
} from "../two-factor";
import {
  fieldErrors,
  twoFactorCodeSchema,
  twoFactorPasswordSchema,
  twoFactorPinSchema,
  type ActionState,
} from "../validation";

const SESSION_EXPIRED: ActionState = {
  status: "error",
  message: "twoFactor.sessionExpired",
};

const INVALID_CODE: ActionState = {
  status: "error",
  message: "twoFactor.invalidCode",
};

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function revalidateAccount(scope: "staff" | "reader") {
  if (scope === "staff") {
    revalidatePath("/panel/cuenta");
  } else {
    revalidatePath("/mi-biblioteca/cuenta");
  }
}

// ---------------------------------------------------------------------------
// Personal
// ---------------------------------------------------------------------------

export async function startStaffTwoFactorAction(): Promise<ActionState> {
  let user;
  try {
    user = await assertUser();
  } catch {
    return SESSION_EXPIRED;
  }

  const account = await prisma.user.findUnique({
    where: { id: user.id },
    select: { username: true, twoFactorEnabled: true },
  });
  if (!account) return { status: "error", message: "actions.accountNotFound" };
  if (account.twoFactorEnabled) {
    return { status: "error", message: "twoFactor.alreadyEnabled" };
  }

  const secret = generateTotpSecret();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      twoFactorPendingSecret: encryptTwoFactorSecret(secret),
      twoFactorPendingAt: new Date(),
    },
  });

  const otpauthUrl = buildTotpUrl({
    secret,
    accountName: account.username,
  });
  const qrDataUrl = await totpQrDataUrl(otpauthUrl);

  return {
    status: "success",
    message: "twoFactor.setupStarted",
    twoFactorSetup: { secret, otpauthUrl, qrDataUrl },
  };
}

export async function confirmStaffTwoFactorAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let user;
  try {
    user = await assertUser();
  } catch {
    return SESSION_EXPIRED;
  }

  const parsed = twoFactorCodeSchema.safeParse({ code: text(formData, "code") });
  if (!parsed.success) {
    return {
      status: "error",
      message: "actions.reviewFields",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const account = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      twoFactorEnabled: true,
      twoFactorPendingSecret: true,
      twoFactorPendingAt: true,
    },
  });
  if (!account) return { status: "error", message: "actions.accountNotFound" };
  if (account.twoFactorEnabled) {
    return { status: "error", message: "twoFactor.alreadyEnabled" };
  }
  if (
    !account.twoFactorPendingSecret ||
    !account.twoFactorPendingAt ||
    Date.now() - account.twoFactorPendingAt.getTime() >
      TWO_FACTOR_PENDING_TTL_MS
  ) {
    await prisma.user.update({
      where: { id: account.id },
      data: { twoFactorPendingSecret: null, twoFactorPendingAt: null },
    });
    return { status: "error", message: "twoFactor.expiredSetup" };
  }

  const secret = decryptTwoFactorSecret(account.twoFactorPendingSecret);
  if (!secret) {
    return { status: "error", message: "twoFactor.configurationError" };
  }

  const result = verifySecondFactor({
    secret,
    recoveryCodeHashes: [],
    code: parsed.data.code,
  });
  if (!result.valid) return INVALID_CODE;

  const recoveryCodes = generateRecoveryCodes(RECOVERY_CODE_COUNT);
  await prisma.user.update({
    where: { id: account.id },
    data: {
      twoFactorEnabled: true,
      twoFactorSecret: account.twoFactorPendingSecret,
      twoFactorRecoveryCodes: recoveryCodes.map(hashRecoveryCode),
      twoFactorPendingSecret: null,
      twoFactorPendingAt: null,
      twoFactorEnabledAt: new Date(),
    },
  });

  await recordAudit({
    action: "TWO_FACTOR_ENABLE",
    entityType: "User",
    entityId: account.id,
    summary: `${user.displayName} ha activado la verificación en dos pasos`,
    userId: account.id,
  });

  revalidateAccount("staff");
  return {
    status: "success",
    message: "twoFactor.enabledSuccess",
    recoveryCodes,
  };
}

export async function disableStaffTwoFactorAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let user;
  try {
    user = await assertUser();
  } catch {
    return SESSION_EXPIRED;
  }

  const parsed = twoFactorPasswordSchema.safeParse({
    currentPassword: text(formData, "currentPassword"),
    code: text(formData, "code"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "actions.reviewFields",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const account = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      passwordHash: true,
      twoFactorEnabled: true,
      twoFactorSecret: true,
      twoFactorRecoveryCodes: true,
    },
  });
  if (!account) return { status: "error", message: "actions.accountNotFound" };
  if (!account.twoFactorEnabled || !account.twoFactorSecret) {
    return { status: "error", message: "twoFactor.notEnabled" };
  }

  const passwordOk = await verifyPassword(
    parsed.data.currentPassword,
    account.passwordHash,
  );
  if (!passwordOk) {
    return {
      status: "error",
      fieldErrors: { currentPassword: "twoFactor.wrongPassword" },
    };
  }

  const secret = decryptTwoFactorSecret(account.twoFactorSecret);
  if (!secret) {
    return { status: "error", message: "twoFactor.configurationError" };
  }
  const result = verifySecondFactor({
    secret,
    recoveryCodeHashes: account.twoFactorRecoveryCodes,
    code: parsed.data.code,
  });
  if (!result.valid) return INVALID_CODE;

  await prisma.user.update({
    where: { id: account.id },
    data: {
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorRecoveryCodes: [],
      twoFactorPendingSecret: null,
      twoFactorPendingAt: null,
      twoFactorEnabledAt: null,
    },
  });

  await recordAudit({
    action: "TWO_FACTOR_DISABLE",
    entityType: "User",
    entityId: account.id,
    summary: `${user.displayName} ha desactivado la verificación en dos pasos`,
    userId: account.id,
  });

  revalidateAccount("staff");
  return { status: "success", message: "twoFactor.disabledSuccess" };
}

export async function regenerateStaffRecoveryCodesAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let user;
  try {
    user = await assertUser();
  } catch {
    return SESSION_EXPIRED;
  }

  const parsed = twoFactorPasswordSchema.safeParse({
    currentPassword: text(formData, "currentPassword"),
    code: text(formData, "code"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "actions.reviewFields",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const account = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      passwordHash: true,
      twoFactorEnabled: true,
      twoFactorSecret: true,
      twoFactorRecoveryCodes: true,
    },
  });
  if (!account) return { status: "error", message: "actions.accountNotFound" };
  if (!account.twoFactorEnabled || !account.twoFactorSecret) {
    return { status: "error", message: "twoFactor.notEnabled" };
  }

  const passwordOk = await verifyPassword(
    parsed.data.currentPassword,
    account.passwordHash,
  );
  if (!passwordOk) {
    return {
      status: "error",
      fieldErrors: { currentPassword: "twoFactor.wrongPassword" },
    };
  }

  const secret = decryptTwoFactorSecret(account.twoFactorSecret);
  if (!secret) {
    return { status: "error", message: "twoFactor.configurationError" };
  }
  const result = verifySecondFactor({
    secret,
    recoveryCodeHashes: account.twoFactorRecoveryCodes,
    code: parsed.data.code,
  });
  if (!result.valid) return INVALID_CODE;

  const recoveryCodes = generateRecoveryCodes(RECOVERY_CODE_COUNT);
  await prisma.user.update({
    where: { id: account.id },
    data: { twoFactorRecoveryCodes: recoveryCodes.map(hashRecoveryCode) },
  });

  await recordAudit({
    action: "TWO_FACTOR_RECOVERY_CODES",
    entityType: "User",
    entityId: account.id,
    summary: `${user.displayName} ha regenerado los códigos de recuperación`,
    userId: account.id,
  });

  revalidateAccount("staff");
  return {
    status: "success",
    message: "twoFactor.regeneratedSuccess",
    recoveryCodes,
  };
}

// ---------------------------------------------------------------------------
// «Mi biblioteca»
// ---------------------------------------------------------------------------

export async function startReaderTwoFactorAction(): Promise<ActionState> {
  let session;
  try {
    session = await assertReader();
  } catch {
    return SESSION_EXPIRED;
  }

  const account = await prisma.reader.findUnique({
    where: { id: session.id },
    select: { cardNumber: true, twoFactorEnabled: true },
  });
  if (!account) return { status: "error", message: "actions.readerGone" };
  if (account.twoFactorEnabled) {
    return { status: "error", message: "twoFactor.alreadyEnabled" };
  }

  const secret = generateTotpSecret();
  await prisma.reader.update({
    where: { id: session.id },
    data: {
      twoFactorPendingSecret: encryptTwoFactorSecret(secret),
      twoFactorPendingAt: new Date(),
    },
  });

  const otpauthUrl = buildTotpUrl({
    secret,
    accountName: account.cardNumber ?? session.fullName,
  });
  const qrDataUrl = await totpQrDataUrl(otpauthUrl);

  return {
    status: "success",
    message: "twoFactor.setupStarted",
    twoFactorSetup: { secret, otpauthUrl, qrDataUrl },
  };
}

export async function confirmReaderTwoFactorAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let session;
  try {
    session = await assertReader();
  } catch {
    return SESSION_EXPIRED;
  }

  const parsed = twoFactorCodeSchema.safeParse({ code: text(formData, "code") });
  if (!parsed.success) {
    return {
      status: "error",
      message: "actions.reviewFields",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const account = await prisma.reader.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      twoFactorEnabled: true,
      twoFactorPendingSecret: true,
      twoFactorPendingAt: true,
    },
  });
  if (!account) return { status: "error", message: "actions.readerGone" };
  if (account.twoFactorEnabled) {
    return { status: "error", message: "twoFactor.alreadyEnabled" };
  }
  if (
    !account.twoFactorPendingSecret ||
    !account.twoFactorPendingAt ||
    Date.now() - account.twoFactorPendingAt.getTime() >
      TWO_FACTOR_PENDING_TTL_MS
  ) {
    await prisma.reader.update({
      where: { id: account.id },
      data: { twoFactorPendingSecret: null, twoFactorPendingAt: null },
    });
    return { status: "error", message: "twoFactor.expiredSetup" };
  }

  const secret = decryptTwoFactorSecret(account.twoFactorPendingSecret);
  if (!secret) {
    return { status: "error", message: "twoFactor.configurationError" };
  }

  const result = verifySecondFactor({
    secret,
    recoveryCodeHashes: [],
    code: parsed.data.code,
  });
  if (!result.valid) return INVALID_CODE;

  const recoveryCodes = generateRecoveryCodes(RECOVERY_CODE_COUNT);
  await prisma.reader.update({
    where: { id: account.id },
    data: {
      twoFactorEnabled: true,
      twoFactorSecret: account.twoFactorPendingSecret,
      twoFactorRecoveryCodes: recoveryCodes.map(hashRecoveryCode),
      twoFactorPendingSecret: null,
      twoFactorPendingAt: null,
      twoFactorEnabledAt: new Date(),
    },
  });

  await recordAudit({
    action: "TWO_FACTOR_ENABLE",
    entityType: "Reader",
    entityId: account.id,
    summary: `${session.fullName} ha activado la verificación en dos pasos en «Mi biblioteca»`,
  });

  revalidateAccount("reader");
  return {
    status: "success",
    message: "twoFactor.enabledSuccess",
    recoveryCodes,
  };
}

export async function disableReaderTwoFactorAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let session;
  try {
    session = await assertReader();
  } catch {
    return SESSION_EXPIRED;
  }

  const parsed = twoFactorPinSchema.safeParse({
    currentPin: text(formData, "currentPin"),
    code: text(formData, "code"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "actions.reviewFields",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const account = await prisma.reader.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      pinHash: true,
      twoFactorEnabled: true,
      twoFactorSecret: true,
      twoFactorRecoveryCodes: true,
    },
  });
  if (!account) return { status: "error", message: "actions.readerGone" };
  if (!account.twoFactorEnabled || !account.twoFactorSecret) {
    return { status: "error", message: "twoFactor.notEnabled" };
  }

  const pinOk = await checkReaderPin(account, parsed.data.currentPin);
  if (!pinOk) {
    return {
      status: "error",
      fieldErrors: { currentPin: "twoFactor.wrongPin" },
    };
  }

  const secret = decryptTwoFactorSecret(account.twoFactorSecret);
  if (!secret) {
    return { status: "error", message: "twoFactor.configurationError" };
  }
  const result = verifySecondFactor({
    secret,
    recoveryCodeHashes: account.twoFactorRecoveryCodes,
    code: parsed.data.code,
  });
  if (!result.valid) return INVALID_CODE;

  await prisma.reader.update({
    where: { id: account.id },
    data: {
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorRecoveryCodes: [],
      twoFactorPendingSecret: null,
      twoFactorPendingAt: null,
      twoFactorEnabledAt: null,
    },
  });

  await recordAudit({
    action: "TWO_FACTOR_DISABLE",
    entityType: "Reader",
    entityId: account.id,
    summary: `${session.fullName} ha desactivado la verificación en dos pasos en «Mi biblioteca»`,
  });

  revalidateAccount("reader");
  return { status: "success", message: "twoFactor.disabledSuccess" };
}

export async function regenerateReaderRecoveryCodesAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let session;
  try {
    session = await assertReader();
  } catch {
    return SESSION_EXPIRED;
  }

  const parsed = twoFactorPinSchema.safeParse({
    currentPin: text(formData, "currentPin"),
    code: text(formData, "code"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "actions.reviewFields",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const account = await prisma.reader.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      pinHash: true,
      twoFactorEnabled: true,
      twoFactorSecret: true,
      twoFactorRecoveryCodes: true,
    },
  });
  if (!account) return { status: "error", message: "actions.readerGone" };
  if (!account.twoFactorEnabled || !account.twoFactorSecret) {
    return { status: "error", message: "twoFactor.notEnabled" };
  }

  const pinOk = await checkReaderPin(account, parsed.data.currentPin);
  if (!pinOk) {
    return {
      status: "error",
      fieldErrors: { currentPin: "twoFactor.wrongPin" },
    };
  }

  const secret = decryptTwoFactorSecret(account.twoFactorSecret);
  if (!secret) {
    return { status: "error", message: "twoFactor.configurationError" };
  }
  const result = verifySecondFactor({
    secret,
    recoveryCodeHashes: account.twoFactorRecoveryCodes,
    code: parsed.data.code,
  });
  if (!result.valid) return INVALID_CODE;

  const recoveryCodes = generateRecoveryCodes(RECOVERY_CODE_COUNT);
  await prisma.reader.update({
    where: { id: account.id },
    data: { twoFactorRecoveryCodes: recoveryCodes.map(hashRecoveryCode) },
  });

  await recordAudit({
    action: "TWO_FACTOR_RECOVERY_CODES",
    entityType: "Reader",
    entityId: account.id,
    summary: `${session.fullName} ha regenerado los códigos de recuperación de «Mi biblioteca»`,
  });

  revalidateAccount("reader");
  return {
    status: "success",
    message: "twoFactor.regeneratedSuccess",
    recoveryCodes,
  };
}
