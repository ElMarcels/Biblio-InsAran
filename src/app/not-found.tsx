import Link from "next/link";

import { PageTransition } from "@/components/PageTransition";
import { getT } from "@/lib/i18n/server";

export default async function NotFound() {
  const t = await getT();
  return (
    <PageTransition>
      <div className="shell flex flex-1 flex-col items-center justify-center py-20 text-center">
        <p className="animate-bounce-in font-display text-[86px] font-bold leading-none text-accent">404</p>
        <h1 className="mt-4 animate-fade-in-up font-display text-[30px] font-bold" style={{ animationDelay: "120ms" }}>
          {t("errors.noHemosEncontradoEstaPagina")}
        </h1>
        <p className="mt-3 max-w-md animate-fade-in-up text-[15px] text-ink-soft" style={{ animationDelay: "180ms" }}>
          {t(
            "errors.puedeQueElEnlaceEsteMalEscritoOQueElLibroYaNoEsteEnElCatalogo",
          )}
        </p>
        <div className="mt-7 flex animate-fade-in-up flex-wrap justify-center gap-2.5" style={{ animationDelay: "240ms" }}>
          <Link href="/catalogo" className="btn-primary">
            {t("errors.irAlCatalogo")}
          </Link>
          <Link href="/" className="btn-outline">
            {t("errors.volverAlInicio")}
          </Link>
        </div>
      </div>
    </PageTransition>
  );
}
