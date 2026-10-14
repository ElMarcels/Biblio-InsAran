import { SITE_NAME } from "@/lib/constants";
import { getT } from "@/lib/i18n/server";

// Se evalúa al cargar el módulo (no durante el render), evitando así el uso de
// valores "inestables" como `new Date()` dentro del árbol de React.
const YEAR = new Date().getFullYear();

export async function SiteFooter() {
  const t = await getT();
  return (
    <footer className="mt-auto border-t-2 border-line bg-surface">
      <div className="shell flex flex-col gap-2 py-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] font-medium">
          {SITE_NAME} · {t("Gestión del fondo bibliográfico")}
        </p>
        <p className="text-[12px] text-ink-faint">
          {t("Plataforma interna · {year}", { year: YEAR })}
        </p>
      </div>
    </footer>
  );
}
