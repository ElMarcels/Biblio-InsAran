"use client";

import { classNames } from "@/lib/format";

import { useT } from "../i18n/LocaleProvider";

export function inputClass(hasError?: boolean): string {
  return classNames("input", hasError && "input-error");
}

/**
 * Campo de formulario: traduce de forma automática su etiqueta, su ayuda y su
 * mensaje de error (el texto en castellano funciona como clave de traducción).
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
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
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
