import type { ReactNode } from "react";
import { ViewTransition } from "react";

/**
 * Transición entre páginas. Por defecto hace un fundido suave; si el enlace
 * define `transitionTypes` con `nav-forward` o `nav-back`, el contenido se
 * desliza en la dirección correspondiente. Debe envolver el contenido de cada
 * `page.tsx` (los layouts persisten y sus transiciones no se activan).
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition
      enter={{
        "nav-forward": "slide-forward",
        "nav-back": "slide-back",
        default: "page-in",
      }}
      exit={{
        "nav-forward": "slide-forward",
        "nav-back": "slide-back",
        default: "page-out",
      }}
    >
      {children}
    </ViewTransition>
  );
}
