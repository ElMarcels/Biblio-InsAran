import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/lib/constants";
import { decodeSessionCookie } from "@/lib/session-cookie";

/** Rutas del panel reservadas a la administración (dueño o rol ADMIN). */
const MANAGER_ONLY = ["/panel/usuarios", "/panel/actividad"];

/**
 * Comprobación optimista de sesión y rol para las rutas del panel.
 *
 * La cookie de sesión va firmada, así que aquí se puede verificar su validez y
 * el rol sin consultar la base de datos. Esto permite responder con una
 * redirección HTTP real (en lugar de un redirect transmitido). La validación
 * definitiva (sesión vigente y usuario activo) se hace en `requireUser()` /
 * `requireManager()` junto a los datos.
 */
export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const session = decodeSessionCookie(request.cookies.get(SESSION_COOKIE)?.value);

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", path + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  const needsManager = MANAGER_ONLY.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
  if (needsManager && session.r !== "OWNER" && session.r !== "ADMIN") {
    return NextResponse.redirect(new URL("/panel", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/panel/:path*"],
};
