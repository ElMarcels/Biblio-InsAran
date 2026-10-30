"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { useT } from "../i18n/LocaleProvider";
import { AssistantChat } from "./AssistantChat";
import type { AssistantScope } from "./types";

/** Sugerencias contextuales según la ruta actual. */
function contextualSuggestions(pathname: string, scope: AssistantScope): string[] | undefined {
  if (pathname.startsWith("/panel/libros")) {
    return [
      "¿Qué libros tienen datos incompletos?",
      "¿Hay posibles duplicados en el catálogo?",
      "Dame un resumen del panel",
    ];
  }
  if (pathname.startsWith("/panel/lectores")) {
    return [
      "Busca lectores del grupo 3r ESO",
      "¿Qué lectores están suspendidos?",
      "¿Qué préstamos están vencidos?",
    ];
  }
  if (pathname.startsWith("/panel/prestamos")) {
    return [
      "¿Qué préstamos están vencidos?",
      "¿Qué préstamos vencen esta semana?",
      "Dame un resumen del panel",
    ];
  }
  if (pathname.startsWith("/panel/reservas")) {
    return [
      "¿Qué reservas están pendientes?",
      "¿Qué libros tienen reservas sin servir?",
      "Dame un resumen del panel",
    ];
  }
  if (pathname.startsWith("/panel/solicitudes")) {
    return [
      "¿Qué solicitudes de compra están pendientes?",
      "Aprueba la última solicitud pendiente",
      "Dame un resumen del panel",
    ];
  }
  if (pathname.startsWith("/panel/estadisticas")) {
    return [
      "¿Cuáles son los libros más prestados?",
      "Dame las estadísticas del panel",
      "¿Qué categorías tienen más títulos?",
    ];
  }
  if (pathname.startsWith("/catalogo") || pathname.startsWith("/libro")) {
    if (scope === "READER") {
      return [
        "¿Qué tengo prestado ahora?",
        "Recomiéndame un libro disponible",
        "¿Puedo prorrogar algún préstamo?",
      ];
    }
    return [
      "¿Qué novedades hay en el catálogo?",
      "Recomiéndame una novela disponible",
      "¿Cuáles son los libros más prestados?",
    ];
  }
  if (pathname.startsWith("/mi-biblioteca")) {
    return [
      "¿Qué tengo prestado ahora?",
      "¿Tengo avisos sin leer?",
      "¿Puedo prorrogar algún préstamo?",
    ];
  }
  return undefined;
}

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

  // Atajo de teclado: Ctrl+K / Cmd+K para abrir/cerrar, Escape para cerrar
  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (!hidden) setOpen((v) => !v);
      }
      if (event.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, hidden]);

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
            contextSuggestions={contextualSuggestions(pathname, scope)}
          />
        </section>
      ) : null}

      <button
        type="button"
        className={`aran-launcher fixed right-5 bottom-5 z-[90] ${open ? "aran-launcher--open" : ""}`}
        aria-label={open ? t("assistant.close") : t("assistant.open")}
        aria-expanded={open}
        title={open ? t("assistant.close") : `${t("assistant.open")} (Ctrl+K)`}
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
