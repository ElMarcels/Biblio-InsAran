import type { TranslationKey } from "@/lib/i18n/translate";

export type PanelNavItem = {
  href: string;
  label: TranslationKey;
  managerOnly?: boolean;
};

export const PANEL_NAV: PanelNavItem[] = [
  { href: "/panel", label: "panel.resumen" },
  { href: "/panel/tareas", label: "panel.tareas" },
  { href: "/panel/libros", label: "panel.libros" },
  { href: "/panel/libros/nuevo", label: "panel.anadirLibro" },
  { href: "/panel/colecciones", label: "panel.listasCuradas" },
  { href: "/panel/lectores", label: "panel.lectores" },
  { href: "/panel/prestamos", label: "panel.prestamos" },
  { href: "/panel/calendario", label: "panel.calendario" },
  { href: "/panel/reservas", label: "panel.reservas" },
  { href: "/panel/solicitudes", label: "panel.solicitudes" },
  { href: "/panel/resenas", label: "panel.reviews.resenas" },
  { href: "/panel/estadisticas", label: "panel.estadisticas" },
  { href: "/panel/resenas", label: "panel.reviews.resenas" },
  { href: "/panel/changelog", label: "panel.novedades", managerOnly: true },
  { href: "/panel/correo", label: "panel.mail.title", managerOnly: true },
  { href: "/panel/usuarios", label: "panel.usuarios", managerOnly: true },
  { href: "/panel/actividad", label: "panel.actividad", managerOnly: true },
  { href: "/panel/cuenta", label: "panel.miCuenta" },
];

export function itemsForRole(role: string): PanelNavItem[] {
  return PANEL_NAV.filter(
    (item) => !item.managerOnly || role === "OWNER" || role === "ADMIN",
  );
}

export function isActive(href: string, pathname: string): boolean {
  if (href === "/panel") return pathname === "/panel";
  if (href === "/panel/libros") {
    // El listado no debe marcarse cuando estamos en "Añadir" o "Editar".
    return pathname === "/panel/libros";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
