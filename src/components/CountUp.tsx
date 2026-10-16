"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Número que cuenta desde 0 hasta `value` cuando el elemento entra en el
 * viewport por primera vez.
 *
 * El valor real se muestra desde el primer render (también en el HTML que
 * envía el servidor): si no hay JavaScript o la hidratación falla, nunca se
 * ve un 0. Solo se anima cuando el elemento aparece al hacer scroll, y si ya
 * estaba a la vista al cargar se muestra el valor directamente, sin parpadeos.
 * Respeta `prefers-reduced-motion`.
 */
export function CountUp({
  value,
  duration = 900,
  className,
}: {
  value: number;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced || typeof IntersectionObserver === "undefined") return;

    let frame = 0;
    // null = aún no se ha observado; true/false = ¿estaba a la vista al montar?
    let visibleAtMount: boolean | null = null;

    const io = new IntersectionObserver(
      (entries) => {
        const intersecting = entries.some((entry) => entry.isIntersecting);

        if (visibleAtMount === null) {
          visibleAtMount = intersecting;
          // Si ya se veía al cargar, el valor correcto ya está en pantalla:
          // no se anima (evita el parpadeo 0 → valor).
          if (intersecting) io.disconnect();
          return;
        }

        if (!intersecting) return;
        io.disconnect();

        const start = performance.now();
        const tick = (now: number) => {
          const progress = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - progress, 3);
          setDisplay(Math.round(value * eased));
          if (progress < 1) frame = requestAnimationFrame(tick);
        };
        setDisplay(0);
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    io.observe(node);

    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value, duration]);

  return (
    <span className={className}>
      <span aria-hidden="true">{display}</span>
      <span className="sr-only">{value}</span>
    </span>
  );
}
