import Link from "next/link";

import { getT } from "@/lib/i18n/server";

export default async function NotFound() {
  const t = await getT();
  return (
    <div className="shell flex flex-1 flex-col items-center justify-center py-20 text-center">
      <p className="font-display text-[86px] font-bold leading-none text-accent">404</p>
      <h1 className="mt-4 font-display text-[30px] font-bold">
        {t("errors.noHemosEncontradoEstaPagina")}
      </h1>
      <p className="mt-3 max-w-md text-[15px] text-ink-soft">
        {t(
          "errors.puedeQueElEnlaceEsteMalEscritoOQueElLibroYaNoEsteEnElCatalogo",
        )}
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-2.5">
        <Link href="/catalogo" className="btn-primary">
          {t("errors.irAlCatalogo")}
        </Link>
        <Link href="/" className="btn-outline">
          {t("errors.volverAlInicio")}
        </Link>
      </div>
    </div>
  );
}
