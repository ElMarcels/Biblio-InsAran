"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { useT } from "../i18n/LocaleProvider";
import { AssistantChat } from "./AssistantChat";
import type { AssistantScope } from "./types";

/**
 * Orbe flotante de Aran. Decide el ámbito en el cliente a partir de la ruta y
 * de las sesiones que ha resuelto el servidor; el endpoint vuelve a validar
 * la identidad, así que manipular esto solo consigue perder herramientas.
 */
export function AssistantOrb({
  hasStaff,
  hasReader,
}: {
  hasStaff: boolean;
  hasReader: boolean;
}) {
  const t = useT();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const hidden =
    pathname === "/login" ||
    pathname === "/mi-biblioteca" ||
    pathname === "/mi-biblioteca/cambio-pin" ||
    pathname === "/asistente";

  const scope: AssistantScope =
    hasStaff && pathname.startsWith("/panel")
      ? "STAFF"
      : hasReader
        ? "READER"
        : "PUBLIC";

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (hidden) return null;

  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label={t("assistant.close")}
          className="fixed inset-0 z-[80] cursor-default bg-ink/20 backdrop-blur-[1px]"
          onClick={() => setOpen(false)}
        />
      ) : null}

      {open ? (
        <section
          role="dialog"
          aria-modal="true"
          aria-label={t("assistant.name")}
          className="aran-panel fixed right-4 bottom-24 z-[90] h-[min(620px,calc(100dvh-8rem))] w-[min(420px,calc(100vw-2rem))] max-sm:right-4 max-sm:left-4 max-sm:w-auto"
        >
          <AssistantChat
            key={scope}
            scope={scope}
            variant="panel"
            onClose={() => setOpen(false)}
          />
        </section>
      ) : null}

      <button
        type="button"
        className={`aran-launcher fixed right-5 bottom-5 z-[90] ${open ? "aran-launcher--open" : ""}`}
        aria-label={open ? t("assistant.close") : t("assistant.open")}
        aria-expanded={open}
        title={open ? t("assistant.close") : t("assistant.open")}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="aran-orb" aria-hidden="true">
          <span className="aran-orb__ring" />
          <span className="aran-orb__core" />
        </span>
        <span className="aran-launcher__label">{t("assistant.name")}</span>
      </button>
    </>
  );
}
