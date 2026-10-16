import { classNames } from "@/lib/format";

/** Una columna del gráfico: un mes con sus préstamos y devoluciones. */
export type ActivityMonth = {
  /** Etiqueta corta del mes (ya formateada por el servidor). */
  label: string;
  /** Año de la columna, para las claves y el `title`. */
  year: number;
  loans: number;
  returns: number;
};

/**
 * Gráfico de barras de la actividad mensual (préstamos frente a devoluciones).
 * Es HTML/CSS puro: las barras crecen desde abajo al entrar en pantalla y
 * respetan `prefers-reduced-motion`. Cada columna lleva un `title` con los
 * valores exactos por si se quiere leer.
 */
export function ActivityChart({
  months,
  loansLabel,
  returnsLabel,
}: {
  months: ActivityMonth[];
  loansLabel: string;
  returnsLabel: string;
}) {
  const max = Math.max(
    1,
    ...months.flatMap((month) => [month.loans, month.returns]),
  );

  return (
    <figure className="border-2 border-line bg-surface p-4 sm:p-5">
      <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] font-semibold uppercase tracking-wide text-ink-faint">
        <span className="flex items-center gap-1.5">
          <span className="size-3 border border-line bg-accent" aria-hidden="true" />
          {loansLabel}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 border border-line bg-ok" aria-hidden="true" />
          {returnsLabel}
        </span>
      </figcaption>

      <div
        className="mt-4 flex h-[150px] items-end gap-2"
        role="img"
        aria-label={`${loansLabel} / ${returnsLabel}`}
      >
        {months.map((month, index) => (
          <div
            key={`${month.year}-${month.label}`}
            className="flex h-full min-w-0 flex-1 flex-col justify-end gap-1"
            title={`${month.label} ${month.year} · ${month.loans} / ${month.returns}`}
          >
            <div className="flex h-full items-end justify-center gap-[3px]">
              <span
                className="bar-up block w-1/2 max-w-[14px] border border-line bg-accent"
                style={{
                  height: `${(month.loans / max) * 100}%`,
                  animationDelay: `${index * 40}ms`,
                }}
              />
              <span
                className="bar-up block w-1/2 max-w-[14px] border border-line bg-ok"
                style={{
                  height: `${(month.returns / max) * 100}%`,
                  animationDelay: `${index * 40 + 60}ms`,
                }}
              />
            </div>
            <span
              className={classNames(
                "truncate text-center text-[9px] font-semibold uppercase tracking-wide",
                index === months.length - 1 ? "text-ink" : "text-ink-faint",
              )}
            >
              {month.label}
            </span>
          </div>
        ))}
      </div>
    </figure>
  );
}
