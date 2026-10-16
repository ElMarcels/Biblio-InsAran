import "server-only";

import { cookies } from "next/headers";

import { isThemePreference, THEME_COOKIE, type ThemePreference } from "./theme";

/** Tema activo según la cookie. Sin cookie (o valor extraño) es `system`. */
export async function getThemePreference(): Promise<ThemePreference> {
  const store = await cookies();
  const value = store.get(THEME_COOKIE)?.value;
  return isThemePreference(value) ? value : "system";
}
