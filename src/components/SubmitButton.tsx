"use client";

import { useFormStatus } from "react-dom";

import { classNames } from "@/lib/format";

/**
 * Botón de envío que se desactiva y cambia de texto mientras el formulario
 * está en curso. Debe usarse dentro de un <form>.
 */
export function SubmitButton({
  children,
  pendingLabel = "Guardando…",
  className = "btn-primary",
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={classNames(className)}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
