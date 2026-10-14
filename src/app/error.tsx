"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="shell flex flex-1 flex-col items-center justify-center py-20 text-center">
      <p className="font-display text-[86px] font-bold leading-none text-accent">!</p>
      <h1 className="mt-4 font-display text-[30px] font-bold">Algo no ha funcionado</h1>
      <p className="mt-3 max-w-md text-[15px] text-ink-soft">
        Se ha producido un error inesperado. Vuelve a intentarlo; si el
        problema continúa, avisa a la persona responsable de la plataforma.
      </p>
      {error.digest ? (
        <p className="mt-2 font-mono text-[12px] text-ink-faint">Ref. {error.digest}</p>
      ) : null}
      <div className="mt-7">
        <button type="button" onClick={reset} className="btn-primary">
          Reintentar
        </button>
      </div>
    </div>
  );
}
