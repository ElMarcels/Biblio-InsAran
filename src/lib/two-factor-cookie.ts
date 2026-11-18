import "server-only";

import crypto from "node:crypto";
import { cookies } from "next/headers";

/**
 * Cookie temporal que recuerda quién ha superado el primer factor (contraseña
 * o PIN) y está pendiente del segundo. Solo entonces se crea la sesión real.
 *
 * El valor va firmado con HMAC-SHA256 y caduca a los pocos minutos, de modo
 * que no sirve para autenticarse por sí solo ni para saltarse el segundo paso.
 */

export type TwoFactorScope = "staff" | "reader";

type PendingPayload = {
  /** Ámbito: personal o «Mi biblioteca». */
  s: TwoFactorScope;
  /** Id de la cuenta (User o Reader). */
  id: string;
  /** Caducidad en milisegundos desde epoch. */
  e: number;
};

export const TWO_FACTOR_PENDING_COOKIE: Record<TwoFactorScope, string> = {
  staff: "biblio_2fa_staff",
  reader: "biblio_2fa_reader",
};

/** Duración del paso pendiente: 10 minutos. */
export const TWO_FACTOR_LOGIN_TTL_MS = 10 * 60 * 1000;

let cachedSecret: string | null = null;

function secret(): string {
  if (cachedSecret) return cachedSecret;

  const fromEnv = process.env.SESSION_SECRET;
  if (fromEnv && fromEnv.length >= 32) {
    cachedSecret = fromEnv;
    return cachedSecret;
  }

  throw new Error(
    "Falta la variable de entorno SESSION_SECRET (mínimo 32 caracteres). " +
      "Genera una con: openssl rand -hex 32",
  );
}

function sign(data: string): string {
  return crypto
    .createHmac("sha256", `biblio-2fa:${secret()}`)
    .update(data)
    .digest("base64url");
}

export function encodePendingCookie(payload: PendingPayload): string {
  const data = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${data}.${sign(data)}`;
}

export function decodePendingCookie(
  value: string | undefined | null,
  scope: TwoFactorScope,
): PendingPayload | null {
  if (!value) return null;

  const separator = value.lastIndexOf(".");
  if (separator <= 0) return null;

  const data = value.slice(0, separator);
  const signature = value.slice(separator + 1);
  const expected = sign(data);

  const providedBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  if (
    providedBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(data, "base64url").toString("utf8"),
    ) as unknown;
    if (!parsed || typeof parsed !== "object") return null;

    const payload = parsed as Partial<PendingPayload>;
    if (payload.s !== scope) return null;
    if (typeof payload.id !== "string" || !payload.id) return null;
    if (typeof payload.e !== "number" || payload.e <= Date.now()) return null;

    return { s: payload.s, id: payload.id, e: payload.e };
  } catch {
    return null;
  }
}

/** Escribe la cookie pendiente. Debe llamarse desde una Server Action. */
export async function setPendingTwoFactorLogin(
  scope: TwoFactorScope,
  id: string,
): Promise<void> {
  const expiresAt = new Date(Date.now() + TWO_FACTOR_LOGIN_TTL_MS);
  const cookieStore = await cookies();
  cookieStore.set(
    TWO_FACTOR_PENDING_COOKIE[scope],
    encodePendingCookie({ s: scope, id, e: expiresAt.getTime() }),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: expiresAt,
    },
  );
}

/** Lee la cookie pendiente y comprueba que corresponde al ámbito indicado. */
export async function readPendingTwoFactorLogin(
  scope: TwoFactorScope,
): Promise<PendingPayload | null> {
  const cookieStore = await cookies();
  return decodePendingCookie(
    cookieStore.get(TWO_FACTOR_PENDING_COOKIE[scope])?.value,
    scope,
  );
}

/** Borra la cookie pendiente (tras verificar o al cancelar). */
export async function clearPendingTwoFactorLogin(
  scope: TwoFactorScope,
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(TWO_FACTOR_PENDING_COOKIE[scope]);
}
