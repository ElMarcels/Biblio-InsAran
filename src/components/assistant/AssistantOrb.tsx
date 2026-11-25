"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  assistantEnabled,
}: {
  hasStaff: boolean;
  hasReader: boolean;
  assistantEnabled: boolean;
}) {
  const t = useT();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [panelView, setPanelView] = useState<"menu" | "chat">("menu");

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

  // Paleta visual del orbe según la pantalla exacta donde esté el usuario
  const orbVariant = getOrbVariant(pathname);

  /** Devuelve la variante de color según la ruta actual. */
  function getOrbVariant(path: string): string {
    // Portada
    if (path === "/") return "home";
    // Catálogo
    if (path.startsWith("/catalogo")) return "catalogo";
    // Ficha de libro
    if (path.startsWith("/libro/")) return "libro";
    // Autores
    if (path === "/autores") return "autores";
    if (path.startsWith("/autor/")) return "autor";
    // Colecciones
    if (path === "/colecciones") return "colecciones";
    if (path.startsWith("/colecciones/")) return "coleccion";
    // Etiquetas
    if (path === "/etiquetas" || path.startsWith("/etiquetas/")) return "etiquetas";
    // Solicitar
    if (path === "/solicitar") return "solicitar";
    // Login
    if (path === "/login") return "login";
    // Asistente
    if (path === "/asistente") return "asistente";
    // Mi biblioteca — login
    if (path === "/mi-biblioteca") return "reader-login";
    if (path === "/mi-biblioteca/cambio-pin") return "reader-pin";
    // Mi biblioteca — zona
    if (path.startsWith("/mi-biblioteca/prestamos")) return "reader-prestamos";
    if (path.startsWith("/mi-biblioteca/reservas")) return "reader-reservas";
    if (path.startsWith("/mi-biblioteca/historial")) return "reader-historial";
    if (path.startsWith("/mi-biblioteca/listas")) return "reader-listas";
    if (path.startsWith("/mi-biblioteca/notificaciones")) return "reader-notificaciones";
    if (path.startsWith("/mi-biblioteca/solicitudes")) return "reader-solicitudes";
    if (path.startsWith("/mi-biblioteca/cuenta")) return "reader-cuenta";
    // Panel — dashboard
    if (path === "/panel") return "panel-home";
    // Panel — libros
    if (path === "/panel/libros") return "panel-libros";
    if (path === "/panel/libros/nuevo") return "panel-libros-nuevo";
    if (path.startsWith("/panel/libros/") && path.endsWith("/editar")) return "panel-libros-editar";
    // Panel — lectores
    if (path === "/panel/lectores") return "panel-lectores";
    if (path.startsWith("/panel/lectores/")) return "panel-lector";
    // Panel — préstamos
    if (path === "/panel/prestamos") return "panel-prestamos";
    if (path === "/panel/prestamos/nuevo") return "panel-prestamos-nuevo";
    // Panel — reservas
    if (path.startsWith("/panel/reservas")) return "panel-reservas";
    // Panel — colecciones
    if (path === "/panel/colecciones") return "panel-colecciones";
    if (path.startsWith("/panel/colecciones/")) return "panel-coleccion";
    // Panel — solicitudes
    if (path.startsWith("/panel/solicitudes")) return "panel-solicitudes";
    // Panel — tareas
    if (path.startsWith("/panel/tareas")) return "panel-tareas";
    // Panel — calendario
    if (path.startsWith("/panel/calendario")) return "panel-calendario";
    // Panel — estadísticas
    if (path.startsWith("/panel/estadisticas")) return "panel-estadisticas";
    // Panel — correo
    if (path === "/panel/correo") return "panel-correo";
    if (path.startsWith("/panel/correo/salida")) return "panel-correo-salida";
    // Panel — reseñas
    if (path.startsWith("/panel/resenas")) return "panel-resenas";
    // Panel — actividad
    if (path.startsWith("/panel/actividad")) return "panel-actividad";
    // Panel — changelog
    if (path.startsWith("/panel/changelog")) return "panel-changelog";
    // Panel — usuarios
    if (path.startsWith("/panel/usuarios")) return "panel-usuarios";
    // Panel — cuenta
    if (path.startsWith("/panel/cuenta")) return "panel-cuenta";
    // Fallback
    return "default";
  }

  // Atajo de teclado: Ctrl+K / Cmd+K para abrir/cerrar, Escape para cerrar
  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (!hidden) {
          if (open) setOpen(false);
          else {
            setPanelView("menu");
            setOpen(true);
          }
        }
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
          className="aran-panel fixed right-4 bottom-24 z-[90] w-[min(420px,calc(100vw-2rem))] max-sm:right-4 max-sm:left-4 max-sm:w-auto"
        >
          {panelView === "chat" ? (
            <div className="h-[min(620px,calc(100dvh-8rem))]">
              <AssistantChat
                key={scope}
                scope={scope}
                variant="panel"
                onClose={() => setOpen(false)}
                contextSuggestions={contextualSuggestions(pathname, scope)}
                pagePath={pathname}
              />
            </div>
          ) : (
            <div className="border-2 border-line bg-surface p-5 shadow-[8px_8px_0_0_var(--color-line)]">
              <div className="mb-4">
                <p className="micro">{t("assistant.name")}</p>
                <h2 className="mt-1 font-display text-[22px] font-bold">
                  {t("assistant.menuTitle")}
                </h2>
                <p className="mt-1 text-[13px] text-ink-soft">
                  {t("assistant.menuIntro")}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (assistantEnabled) setPanelView("chat");
                    else router.push("/asistente");
                  }}
                  className="border-2 border-line bg-paper p-3 text-left transition-colors hover:bg-surface"
                >
                  <span className="block font-display text-[16px] font-bold">
                    {t("assistant.menuAranAI")}
                  </span>
                  <span className="mt-1 block text-[12px] text-ink-faint">
                    {t("assistant.menuAranAIDescription")}
                  </span>
                </button>
                <Link
                  href="/novedades"
                  onClick={() => setOpen(false)}
                  className="border-2 border-line bg-paper p-3 transition-colors hover:bg-surface"
                >
                  <span className="block font-display text-[16px] font-bold">
                    {t("assistant.menuNews")}
                  </span>
                  <span className="mt-1 block text-[12px] text-ink-faint">
                    {t("assistant.menuNewsDescription")}
                  </span>
                </Link>
                {hasStaff ? (
                  <Link
                    href="/panel/aran/ideas"
                    onClick={() => setOpen(false)}
                    className="border-2 border-line bg-paper p-3 transition-colors hover:bg-surface"
                  >
                    <span className="block font-display text-[16px] font-bold">
                      {t("assistant.menuIdeas")}
                    </span>
                    <span className="mt-1 block text-[12px] text-ink-faint">
                      {t("assistant.menuIdeasDescription")}
                    </span>
                  </Link>
                ) : null}
              </div>
            </div>
          )}
        </section>
      ) : null}

      <button
        type="button"
        className={`aran-launcher fixed right-5 bottom-5 z-[90] ${open ? "aran-launcher--open" : ""}`}
        aria-label={open ? t("assistant.close") : t("assistant.open")}
        aria-expanded={open}
        title={open ? t("assistant.close") : `${t("assistant.open")} (Ctrl+K)`}
        onClick={() => {
          if (open) setOpen(false);
          else {
            setPanelView("menu");
            setOpen(true);
          }
        }}
      >
        <span className={`aran-orb aran-orb--${orbVariant}`} aria-hidden="true">
          <span className="aran-orb__ring" />
          <span className="aran-orb__core" />
        </span>
        <span className="aran-launcher__label">{t("assistant.name")}</span>
      </button>
    </>
  );
}
