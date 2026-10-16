"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { setThemeAction } from "@/lib/actions/theme";
import type { TranslationKey } from "@/lib/i18n/translate";
import {
  DARK_CLASS,
  nextThemePreference,
  type ThemePreference,
} from "@/lib/theme";

import { useT } from "./i18n/LocaleProvider";

const LABEL_KEYS: Record<ThemePreference, TranslationKey> = {
  system: "nav.temaSistema",
  light: "nav.temaClaro",
  dark: "nav.temaOscuro",
};

/** Pinta la clase de tema en <html> según la preferencia elegida. */
function applyTheme(theme: ThemePreference) {
  const dark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle(DARK_CLASS, dark);
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

  return (
    <svg {...common}>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

/**
 * Botón de tema. Cicla sistema → claro → oscuro y guarda la elección en una
 * cookie (el servidor la aplica en el HTML; el cliente la aplica al instante).
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

  const label = t(LABEL_KEYS[theme]);

  return (
    <button
      type="button"
      disabled={pending}
      title={label}
      aria-label={label}
      onClick={() => {
        const next = nextThemePreference(theme);
        setTheme(next);
        applyTheme(next);
        startTransition(async () => {
          await setThemeAction(next);
          router.refresh();
        });
      }}
      className="btn-ghost btn-sm px-2"
    >
      <span key={theme} className="animate-pop inline-flex">
        <ThemeIcon theme={theme} />
      </span>
    </button>
  );
}
