import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/lib/constants";
import { decodeSessionCookie } from "@/lib/session-cookie";

/** Rutas del panel reservadas al rol de dueño. */
const OWNER_ONLY = ["/panel/usuarios", "/panel/actividad"];

/**
 * Comprobación optimista de sesión y rol para las rutas del panel.
 *
 * La cookie de sesión va firmada, así que aquí se puede verificar su validez y
 * el rol sin consultar la base de datos. Esto permite responder con una
 * redirección HTTP real (en lugar de un redirect transmitido). La validación
 * definitiva (sesión vigente y usuario activo) se hace en `requireUser()` /
 * `requireOwner()` junto a los datos.
 */
export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const session = decodeSessionCookie(request.cookies.get(SESSION_COOKIE)?.value);

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", path + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  const needsOwner = OWNER_ONLY.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
  if (needsOwner && session.r !== "OWNER") {
    return NextResponse.redirect(new URL("/panel", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/panel/:path*"],
};
