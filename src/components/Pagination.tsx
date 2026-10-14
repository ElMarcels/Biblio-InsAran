import Link from "next/link";

import { classNames } from "@/lib/format";

/**
 * Paginación con enlaces reales (funciona sin JavaScript).
 * `hrefFor` construye la URL de cada página conservando los filtros activos.
 */
export function Pagination({
  page,
  totalPages,
  hrefFor,
}: {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  const pages: Array<number | "gap"> = [];
  const push = (value: number | "gap") => {
    if (pages[pages.length - 1] !== value) pages.push(value);
  };

  for (let current = 1; current <= totalPages; current += 1) {
    if (
      current === 1 ||
      current === totalPages ||
      Math.abs(current - page) <= 1
    ) {
      push(current);
    } else {
      push("gap");
    }
  }

  const linkClass =
    "flex h-9 min-w-9 items-center justify-center border-2 border-line px-2 text-[13px] font-semibold tabular-nums";

  return (
    <nav aria-label="Paginación" className="flex flex-wrap items-center gap-1.5">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={classNames(linkClass, "bg-surface hover:bg-paper")}>
          ← Anterior
        </Link>
      ) : (
        <span className={classNames(linkClass, "cursor-not-allowed border-hairline text-ink-faint")}>
          ← Anterior
        </span>
      )}

      {pages.map((value, index) =>
        value === "gap" ? (
          <span key={`gap-${index}`} className="px-1 text-ink-faint">
            …
          </span>
        ) : (
          <Link
            key={value}
            href={hrefFor(value)}
            aria-current={value === page ? "page" : undefined}
            className={classNames(
              linkClass,
              value === page
                ? "border-line bg-ink text-paper"
                : "bg-surface hover:bg-paper",
            )}
          >
            {value}
          </Link>
        ),
      )}

      {page < totalPages ? (
        <Link href={hrefFor(page + 1)} className={classNames(linkClass, "bg-surface hover:bg-paper")}>
          Siguiente →
        </Link>
      ) : (
        <span className={classNames(linkClass, "cursor-not-allowed border-hairline text-ink-faint")}>
          Siguiente →
        </span>
      )}
    </nav>
  );
}
