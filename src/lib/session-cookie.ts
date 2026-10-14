import crypto from "node:crypto";

/**
 * Cookie de sesión firmada.
 *
 * El valor tiene la forma `payload.signatura`, donde el payload es un JSON
 * codificado en base64url y la firma es un HMAC-SHA256. Incluye de forma
 * *optimista* el rol y la caducidad para que el Proxy pueda decidir sin
 * consultar la base de datos (que sigue siendo la fuente de verdad).
 *
 * Este módulo no depende del runtime de Next ni de Prisma para poder usarse
 * tanto en el Proxy como en el servidor.
 */

export type SessionRole = "OWNER" | "EDITOR";

export type SessionCookiePayload = {
  /** Token de sesión (se contrasta con el hash guardado en la base de datos). */
  t: string;
  /** Rol de la cuenta (solo para comprobaciones optimistas). */
  r: SessionRole;
  /** Caducidad en milisegundos desde epoch. */
  e: number;
};

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
  return crypto.createHmac("sha256", secret()).update(data).digest("base64url");
}

export function encodeSessionCookie(payload: SessionCookiePayload): string {
  const data = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${data}.${sign(data)}`;
}

export function decodeSessionCookie(
  value: string | undefined | null,
): SessionCookiePayload | null {
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
    const parsed = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as unknown;
    if (!parsed || typeof parsed !== "object") return null;

    const payload = parsed as Partial<SessionCookiePayload>;
    if (typeof payload.t !== "string" || typeof payload.e !== "number") return null;
    if (payload.r !== "OWNER" && payload.r !== "EDITOR") return null;
    if (payload.e <= Date.now()) return null;

    return { t: payload.t, r: payload.r, e: payload.e };
  } catch {
    return null;
  }
}
