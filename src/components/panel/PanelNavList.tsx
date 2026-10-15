"use client";

import Link from "next/link";

import { classNames } from "@/lib/format";

import { useT } from "../i18n/LocaleProvider";
import { isActive, type PanelNavItem } from "./nav-items";

/**
 * Navegación del panel. Traduce las etiquetas y conserva el marcado de la
 * sección activa; funciona igual en servidor que en cliente.
 */
export function PanelNavList({
  items,
  pathname,
}: {
  items: PanelNavItem[];
  pathname?: string;
}) {
  const t = useT();

  return (
    <nav aria-label={t("panel.seccionesDelPanel")} className="-mb-2 flex flex-wrap gap-1">
      {items.map((item) => {
        const active = pathname ? isActive(item.href, pathname) : false;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={classNames(
              "border-b-2 px-3 py-2 text-[14px] font-semibold transition-colors",
              active
                ? "border-accent text-ink"
                : "border-transparent text-ink-faint hover:border-line hover:text-ink",
            )}
          >
            {t(item.label)}
          </Link>
        );
      })}
    </nav>
  );
}
