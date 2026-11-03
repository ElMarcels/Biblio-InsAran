"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { LicenseAttribution } from "./LicenseAttribution";
import { useT } from "./i18n/LocaleProvider";

/**
 * Aviso de derechos de autor y licencia Creative Commons.
 *
 * Aparece al entrar en la plataforma (en cada carga completa de la página) y
 * se cierra con el botón o con la tecla Escape.
 */
export function LicenseGate() {
  const t = useT();
  const [open, setOpen] = useState(true);
  const closeRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/60 p-4 backdrop-blur-sm sm:items-center sm:p-6"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="license-title"
        aria-describedby="license-description"
        className="animate-scale-in my-auto flex w-full max-w-xl flex-col border-2 border-line bg-surface shadow-[8px_8px_0_0_var(--color-line)]"
      >
        <div className="flex items-start justify-between gap-4 border-b-2 border-line bg-paper px-5 py-4 sm:px-7">
          <div>
            <p className="micro">{t("license.licencia")}</p>
            <h2
              id="license-title"
              className="mt-1.5 font-display text-[22px] font-bold"
            >
              {t("license.avisoDeDerechosDeAutor")}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            aria-label={t("license.cerrar")}
            className="flex size-9 shrink-0 items-center justify-center border-2 border-line bg-surface text-[16px] font-bold transition-colors hover:bg-paper"
          >
            ×
          </button>
        </div>

        <div className="px-5 py-5 sm:px-7">
          <p
            id="license-description"
            className="text-[14px] leading-relaxed text-ink-soft"
          >
            {t("license.explicacion")}
          </p>
          <p className="mt-5 border-l-4 border-accent bg-paper px-4 py-3 text-[13px] leading-relaxed text-ink">
            <LicenseAttribution />
          </p>
        </div>

        <div className="flex items-center justify-end border-t-2 border-line bg-paper px-5 py-4 sm:px-7">
          <button type="button" onClick={close} className="btn-primary">
            {t("license.entendido")}
          </button>
        </div>
      </div>
    </div>
  );
}
