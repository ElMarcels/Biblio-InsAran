import { NextResponse, type NextRequest } from "next/server";

import { READER_SESSION_COOKIE, SESSION_COOKIE } from "@/lib/constants";
import { decodeReaderSessionCookie } from "@/lib/reader-session-cookie";
import { decodeSessionCookie } from "@/lib/session-cookie";

/** Rutas del panel reservadas a la administración (dueño o rol ADMIN). */
const MANAGER_ONLY = ["/panel/usuarios", "/panel/actividad", "/panel/changelog"];

/**
 * Comprobación optimista de sesión y rol para las rutas del panel y del área
 * del lector («Mi biblioteca»).
 *
 * Las cookies van firmadas, así que aquí se puede verificar su validez sin
 * consultar la base de datos. Esto permite responder con una redirección HTTP
 * real (en lugar de un redirect transmitido). La validación definitiva
 * (sesión vigente y cuenta activa) se hace en `requireUser()` /
 * `requireManager()` / `requireReader()` junto a los datos.
 */
export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // --- Área del lector/a («Mi biblioteca») -------------------------------
  if (path === "/mi-biblioteca" || path.startsWith("/mi-biblioteca/")) {
    // La portada del área es pública: es donde está el formulario de acceso.
    if (path === "/mi-biblioteca") return NextResponse.next();

    const readerSession = decodeReaderSessionCookie(
      request.cookies.get(READER_SESSION_COOKIE)?.value,
    );
    if (!readerSession) {
      const loginUrl = new URL("/mi-biblioteca", request.url);
      loginUrl.searchParams.set("next", path + request.nextUrl.search);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // --- Panel de gestión --------------------------------------------------
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
  matcher: ["/panel/:path*", "/mi-biblioteca/:path*"],
};
