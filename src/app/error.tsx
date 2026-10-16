"use client";

import { useEffect } from "react";

import { useT } from "@/components/i18n/LocaleProvider";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="shell flex flex-1 flex-col items-center justify-center py-20 text-center">
      <p className="animate-shake font-display text-[86px] font-bold leading-none text-accent">!</p>
      <h1 className="mt-4 animate-fade-in-up font-display text-[30px] font-bold" style={{ animationDelay: "120ms" }}>
        {t("errors.algoNoHaFuncionado")}
      </h1>
      <p className="mt-3 max-w-md animate-fade-in-up text-[15px] text-ink-soft" style={{ animationDelay: "180ms" }}>
        {t(
          "errors.seHaProducidoUnErrorInesperadoVuelveAIntentarloSiElProblemaConti",
        )}
      </p>
      {error.digest ? (
        <p className="mt-2 animate-fade-in-up font-mono text-[12px] text-ink-faint" style={{ animationDelay: "220ms" }}>
          {t("errors.refDigest", { digest: error.digest })}
        </p>
      ) : null}
      <div className="mt-7 animate-fade-in-up" style={{ animationDelay: "260ms" }}>
        <button type="button" onClick={reset} className="btn-primary">
          {t("errors.reintentar")}
        </button>
      </div>
    </div>
  );
}
