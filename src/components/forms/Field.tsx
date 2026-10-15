"use client";

import { classNames } from "@/lib/format";
import type { TranslationKey } from "@/lib/i18n/translate";

import { useT } from "../i18n/LocaleProvider";

export function inputClass(hasError?: boolean): string {
  return classNames("input", hasError && "input-error");
}

/**
 * Campo de formulario: traduce de forma automática su etiqueta, su ayuda y su
 * mensaje de error (las claves vienen del diccionario de traducciones).
 */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className,
}: {
  label: TranslationKey;
  htmlFor: string;
  error?: TranslationKey;
  hint?: TranslationKey;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const t = useT();

  return (
    <div className={className}>
      <label className="label" htmlFor={htmlFor}>
        {t(label)}
        {required ? (
          <span className="text-accent" aria-hidden="true">
            {" "}
            *
          </span>
        ) : null}
      </label>
      {children}
      {hint && !error ? <p className="hint">{t(hint)}</p> : null}
      {error ? (
        <p className="error-text" id={`${htmlFor}-error`}>
          {t(error)}
        </p>
      ) : null}
    </div>
  );
}
