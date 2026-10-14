import "server-only";

import crypto from "node:crypto";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";

import { prisma } from "./prisma";
import { SESSION_COOKIE, SESSION_TTL_MS } from "./constants";
import { decodeSessionCookie, encodeSessionCookie } from "./session-cookie";

// ---------------------------------------------------------------------------
// Contraseñas
// ---------------------------------------------------------------------------

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ---------------------------------------------------------------------------
// Sesiones
// ---------------------------------------------------------------------------

/** El token se guarda hasheado en la base de datos, nunca en claro. */
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export type SessionUser = {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  mustChangePassword: boolean;
};

function clientIp(headerList: Headers): string | null {
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim().slice(0, 64);
  return headerList.get("x-real-ip")?.slice(0, 64) ?? null;
}

/**
 * Devuelve el usuario de la sesión actual o `null`.
 * `cache` evita repetir la consulta varias veces dentro del mismo render.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const cookieStore = await cookies();
  const payload = decodeSessionCookie(cookieStore.get(SESSION_COOKIE)?.value);
  if (!payload) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(payload.t) },
    include: { user: true },
  });
  if (!session) return null;

  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  if (!session.user.active) return null;

  return {
    id: session.user.id,
    username: session.user.username,
    displayName: session.user.displayName,
    role: session.user.role,
    mustChangePassword: session.user.mustChangePassword,
  };
});

/** Crea una sesión y escribe la cookie. Debe llamarse desde una Server Action. */
export async function createSession(userId: string, role: Role): Promise<void> {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const headerList = await headers();

  await prisma.session.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt,
      userAgent: headerList.get("user-agent")?.slice(0, 255) ?? null,
      ip: clientIp(headerList),
    },
  });

  const value = encodeSessionCookie({
    t: token,
    r: role === "OWNER" ? "OWNER" : "EDITOR",
    e: expiresAt.getTime(),
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

/** Cierra la sesión actual: borra el registro y la cookie. */
export async function destroyCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const payload = decodeSessionCookie(cookieStore.get(SESSION_COOKIE)?.value);
  if (payload) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(payload.t) } });
  }
  cookieStore.delete(SESSION_COOKIE);
}

/** Invalida todas las sesiones de un usuario (al desactivarlo o cambiar contraseña). */
export async function revokeUserSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}

// ---------------------------------------------------------------------------
// Guardas para páginas (redirigen) y para acciones (lanzan error)
// ---------------------------------------------------------------------------

/** Para páginas: exige sesión y redirige al acceso si no la hay. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Para páginas: exige el rol de dueño. */
export async function requireOwner(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "OWNER") redirect("/panel");
  return user;
}

export class AuthError extends Error {
  constructor(message = "No tienes permiso para realizar esta acción.") {
    super(message);
    this.name = "AuthError";
  }
}

/** Para Server Actions: exige permiso o lanza. */
export async function assertUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError();
  return user;
}

/** Para Server Actions: exige el rol de dueño o lanza. */
export async function assertOwner(): Promise<SessionUser> {
  const user = await assertUser();
  if (user.role !== "OWNER") throw new AuthError();
  return user;
}
