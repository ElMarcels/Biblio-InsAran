import crypto from "node:crypto";

/**
 * Cookie de sesión del área del lector/a («Mi biblioteca»).
 *
 * Mismo esquema que la cookie del personal (`session-cookie.ts`): payload en
 * base64url firmado con HMAC-SHA256, con la caducidad de forma *optimista*
 * para que el Proxy pueda decidir sin consultar la base de datos. No lleva
 * rol: la identidad es siempre una persona lectora. La tabla
 * `ReaderSession` sigue siendo la fuente de verdad.
 */

export type ReaderCookiePayload = {
  /** Token de sesión (se contrasta con el hash guardado en la base de datos). */
  t: string;
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

export function encodeReaderSessionCookie(payload: ReaderCookiePayload): string {
  const data = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${data}.${sign(data)}`;
}

export function decodeReaderSessionCookie(
  value: string | undefined | null,
): ReaderCookiePayload | null {
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

    const payload = parsed as Partial<ReaderCookiePayload>;
    if (typeof payload.t !== "string" || typeof payload.e !== "number") return null;
    if (payload.e <= Date.now()) return null;

    return { t: payload.t, e: payload.e };
  } catch {
    return null;
  }
}
