import Link from "next/link";

import { classNames } from "@/lib/format";
import { getT } from "@/lib/i18n/server";

/**
 * Paginación con enlaces reales (funciona sin JavaScript).
 * `hrefFor` construye la URL de cada página conservando los filtros activos.
 */
export async function Pagination({
  page,
  totalPages,
  hrefFor,
}: {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  const t = await getT();

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
    <nav aria-label={t("common.paginacion")} className="flex flex-wrap items-center gap-1.5">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={classNames(linkClass, "bg-surface hover:bg-paper")}>
          ← {t("common.anterior")}
        </Link>
      ) : (
        <span className={classNames(linkClass, "cursor-not-allowed border-hairline text-ink-faint")}>
          ← {t("common.anterior")}
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
          {t("common.siguiente")} →
        </Link>
      ) : (
        <span className={classNames(linkClass, "cursor-not-allowed border-hairline text-ink-faint")}>
          {t("common.siguiente")} →
        </span>
      )}
    </nav>
  );
}
