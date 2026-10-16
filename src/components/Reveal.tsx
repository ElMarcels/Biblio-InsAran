"use client";

import { useEffect, useRef } from "react";

import { classNames } from "@/lib/format";

let observer: IntersectionObserver | null = null;

/** Observador compartido: uno solo para todos los elementos revelados. */
function getObserver(): IntersectionObserver | null {
  if (typeof IntersectionObserver === "undefined") return null;
  if (!observer) {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer?.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.05 },
    );
  }
  return observer;
}

/**
 * Revela su contenido cuando entra en el viewport (una sola vez).
 * `delay` escalona listas y rejillas: cada elemento entra un poco después.
 */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    const io = getObserver();
    if (!node) return;
    if (!io) {
      node.classList.add("is-visible");
      return;
    }
    io.observe(node);
    return () => io.unobserve(node);
  }, []);

  return (
    <div
      ref={ref}
      className={classNames("reveal", className)}
      style={{ "--rd": `${delay}ms` } as React.CSSProperties}
    >
      {children}
    </div>
  );
}
