import "server-only";

import crypto from "node:crypto";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";

import { prisma } from "./prisma";
import { INITIAL_READER_PIN, READER_SESSION_COOKIE, READER_SESSION_TTL_MS } from "./constants";
import {
  decodeReaderSessionCookie,
  encodeReaderSessionCookie,
} from "./reader-session-cookie";

// ---------------------------------------------------------------------------
// PIN
// ---------------------------------------------------------------------------

/** Guarda el PIN con bcrypt (mismo coste que las contraseñas). */
export function hashPin(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export function verifyPin(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Comprueba un PIN contra un lector o lectora.
 *
 * Si todavía no ha elegido el suyo (`pinHash` null), solo se acepta el PIN
 * inicial compartido; la persona deberá cambiarlo en ese mismo acceso.
 */
export async function checkReaderPin(
  reader: { pinHash: string | null },
  pin: string,
): Promise<boolean> {
  if (reader.pinHash) return verifyPin(pin, reader.pinHash);
  return pin === INITIAL_READER_PIN;
}

// ---------------------------------------------------------------------------
// Sesiones
// ---------------------------------------------------------------------------

/** El token se guarda hasheado en la base de datos, nunca en claro. */
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export type SessionReader = {
  id: string;
  fullName: string;
  cardNumber: string | null;
  groupName: string | null;
  /** Debe cambiar el PIN antes de usar «Mi biblioteca». */
  pinMustChange: boolean;
};

function clientIp(headerList: Headers): string | null {
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim().slice(0, 64);
  return headerList.get("x-real-ip")?.slice(0, 64) ?? null;
}

/**
 * Devuelve a la persona lectora de la sesión actual o `null`.
 * `cache` evita repetir la consulta varias veces dentro del mismo render.
 */
export const getCurrentReader = cache(
  async (): Promise<SessionReader | null> => {
    const cookieStore = await cookies();
    const payload = decodeReaderSessionCookie(
      cookieStore.get(READER_SESSION_COOKIE)?.value,
    );
    if (!payload) return null;

    const session = await prisma.readerSession.findUnique({
      where: { tokenHash: hashToken(payload.t) },
      include: { reader: true },
    });
    if (!session) return null;

    if (session.expiresAt.getTime() <= Date.now()) {
      await prisma.readerSession
        .delete({ where: { id: session.id } })
        .catch(() => undefined);
      return null;
    }
    if (!session.reader.active) return null;

    return {
      id: session.reader.id,
      fullName: session.reader.fullName,
      cardNumber: session.reader.cardNumber,
      groupName: session.reader.groupName,
      pinMustChange: session.reader.pinMustChange,
    };
  },
);

/** Crea la sesión y escribe la cookie. Debe llamarse desde una Server Action. */
export async function createReaderSession(readerId: string): Promise<void> {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + READER_SESSION_TTL_MS);
  const headerList = await headers();

  await prisma.readerSession.create({
    data: {
      tokenHash: hashToken(token),
      readerId,
      expiresAt,
      userAgent: headerList.get("user-agent")?.slice(0, 255) ?? null,
      ip: clientIp(headerList),
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(
    READER_SESSION_COOKIE,
    encodeReaderSessionCookie({ t: token, e: expiresAt.getTime() }),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: expiresAt,
    },
  );
}

/** Cierra la sesión del lector/a: borra el registro y la cookie. */
export async function destroyReaderSession(): Promise<void> {
  const cookieStore = await cookies();
  const payload = decodeReaderSessionCookie(
    cookieStore.get(READER_SESSION_COOKIE)?.value,
  );
  if (payload) {
    await prisma.readerSession.deleteMany({
      where: { tokenHash: hashToken(payload.t) },
    });
  }
  cookieStore.delete(READER_SESSION_COOKIE);
}

/** Invalida todas las sesiones de un lector/a (al darle de baja o restablecerle el PIN). */
export async function revokeReaderSessions(readerId: string): Promise<void> {
  await prisma.readerSession.deleteMany({ where: { readerId } });
}

// ---------------------------------------------------------------------------
// Guardas
// ---------------------------------------------------------------------------

export class ReaderAuthError extends Error {
  constructor(message = "No tienes permiso para realizar esta acción.") {
    super(message);
    this.name = "ReaderAuthError";
  }
}

/** Para páginas: exige sesión de lector/a y redirige al acceso si no la hay. */
export async function requireReader(): Promise<SessionReader> {
  const reader = await getCurrentReader();
  if (!reader) redirect("/mi-biblioteca");
  return reader;
}

/** Para Server Actions: exige sesión de lector/a o lanza. */
export async function assertReader(): Promise<SessionReader> {
  const reader = await getCurrentReader();
  if (!reader) throw new ReaderAuthError();
  return reader;
}
