"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { isThemePreference, THEME_COOKIE, type ThemePreference } from "../theme";

const ONE_YEAR = 60 * 60 * 24 * 365;

/**
 * Guarda el tema elegido en una cookie y refresca la interfaz. `system` borra
 * la cookie para volver a seguir la preferencia del sistema operativo.
 */
export async function setThemeAction(theme: ThemePreference): Promise<void> {
  if (!isThemePreference(theme)) return;

  const store = await cookies();
  if (theme === "system") {
    store.delete(THEME_COOKIE);
  } else {
    store.set(THEME_COOKIE, theme, {
      path: "/",
      maxAge: ONE_YEAR,
      sameSite: "lax",
    });
  }

  revalidatePath("/", "layout");
}
