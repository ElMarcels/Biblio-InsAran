"use client";

import { useFormStatus } from "react-dom";

import { classNames } from "@/lib/format";
import type { TranslationKey } from "@/lib/i18n/translate";

import { useT } from "./i18n/LocaleProvider";

/**
 * Botón de envío que se desactiva y cambia de texto mientras el formulario
 * está en curso. Debe usarse dentro de un <form>.
 */
export function SubmitButton({
  children,
  pendingLabel = "common.saving",
  className = "btn-primary",
}: {
  children: React.ReactNode;
  pendingLabel?: TranslationKey;
  className?: string;
}) {
  const { pending } = useFormStatus();
  const t = useT();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={classNames(className)}
    >
      {pending ? (
        <>
          <span className="spinner" aria-hidden="true" />
          {t(pendingLabel)}
        </>
      ) : (
        children
      )}
    </button>
  );
}
