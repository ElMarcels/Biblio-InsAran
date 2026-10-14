export type PanelNavItem = {
  href: string;
  label: string;
  ownerOnly?: boolean;
};

export const PANEL_NAV: PanelNavItem[] = [
  { href: "/panel", label: "Resumen" },
  { href: "/panel/tareas", label: "Tareas" },
  { href: "/panel/libros", label: "Libros" },
  { href: "/panel/libros/nuevo", label: "Añadir libro" },
  { href: "/panel/colecciones", label: "Listas curadas" },
  { href: "/panel/lectores", label: "Lectores" },
  { href: "/panel/prestamos", label: "Préstamos" },
  { href: "/panel/reservas", label: "Reservas" },
  { href: "/panel/usuarios", label: "Usuarios", ownerOnly: true },
  { href: "/panel/actividad", label: "Actividad", ownerOnly: true },
  { href: "/panel/cuenta", label: "Mi cuenta" },
];

export function itemsForRole(role: string): PanelNavItem[] {
  return PANEL_NAV.filter((item) => !item.ownerOnly || role === "OWNER");
}

export function isActive(href: string, pathname: string): boolean {
  if (href === "/panel") return pathname === "/panel";
  if (href === "/panel/libros") {
    // El listado no debe marcarse cuando estamos en "Añadir" o "Editar".
    return pathname === "/panel/libros";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
