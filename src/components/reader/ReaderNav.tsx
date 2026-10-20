"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { classNames } from "@/lib/format";

import { useT } from "../i18n/LocaleProvider";

const TABS = [
  { href: "/mi-biblioteca/prestamos", label: "reader.tabLoans" },
  { href: "/mi-biblioteca/reservas", label: "reader.tabReservations" },
  { href: "/mi-biblioteca/historial", label: "reader.tabHistory" },
  { href: "/mi-biblioteca/cuenta", label: "reader.tabAccount" },
] as const;

/** Secciones del área del lector/a (préstamos, reservas, historial, cuenta). */
export function ReaderNav() {
  const pathname = usePathname();
  const t = useT();

  return (
    <nav aria-label={t("reader.sections")} className="flex flex-wrap gap-1.5">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={classNames(
              "border-2 px-3 py-1.5 text-[14px] font-semibold transition-colors",
              active
                ? "border-line bg-ink text-paper"
                : "border-transparent hover:border-line hover:bg-paper",
            )}
          >
            {t(tab.label)}
          </Link>
        );
      })}
    </nav>
  );
}
