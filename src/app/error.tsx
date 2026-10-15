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
      <p className="font-display text-[86px] font-bold leading-none text-accent">!</p>
      <h1 className="mt-4 font-display text-[30px] font-bold">
        {t("errors.algoNoHaFuncionado")}
      </h1>
      <p className="mt-3 max-w-md text-[15px] text-ink-soft">
        {t(
          "errors.seHaProducidoUnErrorInesperadoVuelveAIntentarloSiElProblemaConti",
        )}
      </p>
      {error.digest ? (
        <p className="mt-2 font-mono text-[12px] text-ink-faint">
          {t("errors.refDigest", { digest: error.digest })}
        </p>
      ) : null}
      <div className="mt-7">
        <button type="button" onClick={reset} className="btn-primary">
          {t("errors.reintentar")}
        </button>
      </div>
    </div>
  );
}
