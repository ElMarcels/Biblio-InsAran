"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { setThemeAction } from "@/lib/actions/theme";
import type { TranslationKey } from "@/lib/i18n/translate";
import {
  DARK_CLASS,
  THEME_PREFERENCES,
  type ThemePreference,
} from "@/lib/theme";

import { useT } from "./i18n/LocaleProvider";

const LABEL_KEYS: Record<ThemePreference, TranslationKey> = {
  system: "nav.temaSistema",
  light: "nav.temaClaro",
  dark: "nav.temaOscuro",
  gta6: "nav.temaGta6",
};

/** Pinta la clase de tema en <html> según la preferencia elegida. */
function applyTheme(theme: ThemePreference) {
  const dark =
    theme === "dark" || theme === "gta6" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle(DARK_CLASS, dark);
  document.documentElement.classList.toggle("gta6", theme === "gta6");
}

function ThemeIcon({ theme }: { theme: ThemePreference }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (theme === "light") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    );
  }

  if (theme === "dark") {
    return (
      <svg {...common}>
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      </svg>
    );
  }

  if (theme === "gta6") {
    return (
      <svg {...common}>
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

/**
 * Selector desplegable de tema. Permite elegir entre sistema, claro, oscuro y
 * GTA6 y guarda la elección en una cookie (el servidor la aplica en el HTML;
 * el cliente la aplica al instante).
 */
export function ThemeToggle({ initial }: { initial: ThemePreference }) {
  const t = useT();
  const router = useRouter();
  const [theme, setTheme] = useState<ThemePreference>(initial);
  const [pending, startTransition] = useTransition();

  // Con «sistema» activo seguimos los cambios del sistema operativo en vivo.
  useEffect(() => {
    if (theme !== "system") return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [theme]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value as ThemePreference;
    setTheme(next);
    applyTheme(next);
    startTransition(async () => {
      await setThemeAction(next);
      router.refresh();
    });
  };

  return (
    <label className="relative">
      <select
        value={theme}
        disabled={pending}
        aria-label={t(LABEL_KEYS[theme])}
        title={t(LABEL_KEYS[theme])}
        onChange={handleChange}
        className="appearance-none bg-transparent cursor-pointer py-1 pl-4 pr-7 rounded hover:bg-base-200 focus:bg-base-200 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
      >
        {THEME_PREFERENCES.map((pref) => (
          <option key={pref} value={pref}>
            {t(LABEL_KEYS[pref])}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-1 flex items-center">
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="opacity-50"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </span>
    </label>
  );
}
