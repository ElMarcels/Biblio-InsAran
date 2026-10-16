// Preferencia de tema de la interfaz.
//
// `system` (valor por defecto) sigue la preferencia del sistema operativo y no
// escribe cookie; `light` y `dark` son elecciones explícitas que se recuerdan
// en una cookie. El servidor pinta la clase `dark` en <html> a partir de la
// cookie y un pequeño script la completa antes del primer pintado cuando el
// tema es `system`.
//
// Este módulo puede importarse desde componentes de cliente: no usa APIs de
// servidor (las que necesitan `cookies()` viven en `theme-server.ts`).

export const THEME_COOKIE = "biblio_theme";

export type ThemePreference = "system" | "light" | "dark";

export const THEME_PREFERENCES: readonly ThemePreference[] = [
  "system",
  "light",
  "dark",
];

/** Clase que se añade a <html> cuando el tema oscuro está activo. */
export const DARK_CLASS = "dark";

export function isThemePreference(value: unknown): value is ThemePreference {
  return (
    typeof value === "string" &&
    (THEME_PREFERENCES as readonly string[]).includes(value)
  );
}

/** Siguiente tema del ciclo al pulsar el botón: sistema → claro → oscuro. */
export function nextThemePreference(theme: ThemePreference): ThemePreference {
  const index = THEME_PREFERENCES.indexOf(theme);
  return THEME_PREFERENCES[(index + 1) % THEME_PREFERENCES.length];
}

/**
 * Script que se inyecta al principio de <body>: aplica el tema antes del
 * primer pintado para que no haya destello claro/oscuro. Con cookie `dark` o
 * `light` el servidor ya lo ha resuelto; con `system` (o sin cookie) es este
 * script quien consulta la preferencia del sistema.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var m=document.cookie.match(/(?:^|; )${THEME_COOKIE}=([^;]*)/);var p=m?decodeURIComponent(m[1]):"system";var d=p==="dark"||(p==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("${DARK_CLASS}",d);}catch(e){}})();`;
