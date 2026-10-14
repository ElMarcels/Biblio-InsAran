"use client";

import { usePathname } from "next/navigation";

import { itemsForRole } from "./nav-items";
import { PanelNavList } from "./PanelNavList";

export function PanelNav({ role }: { role: string }) {
  const pathname = usePathname();
  return <PanelNavList items={itemsForRole(role)} pathname={pathname} />;
}
