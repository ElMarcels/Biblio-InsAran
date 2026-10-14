import Link from "next/link";

import { tagHref } from "@/lib/library";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Materias" };

export default async function TagsPage() {
  const rows = await prisma.$queryRaw<Array<{ tag: string; count: number }>>`
    SELECT unnest(tags) AS tag, count(*)::int AS count
    FROM "Book"
    GROUP BY tag
    ORDER BY count DESC, tag ASC
  `;

  const max = rows.reduce((top, row) => Math.max(top, row.count), 0);

  return (
    <div className="shell flex flex-1 flex-col py-10">
      <header className="mb-8">
        <p className="micro mb-3">Materias</p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="font-display text-[38px] font-bold sm:text-[46px]">
            Etiquetas del catálogo
          </h1>
          <p className="text-[14px] text-ink-soft tabular-nums">
            {rows.length === 1 ? "1 etiqueta" : `${rows.length} etiquetas`}
          </p>
        </div>
        <p className="mt-3 max-w-2xl text-[14px] text-ink-soft">
          Materias libres que el personal añade a cada libro. El tamaño indica
          cuántos títulos llevan la etiqueta.
        </p>
      </header>

      {rows.length === 0 ? (
        <p className="border-2 border-dashed border-hairline bg-surface p-10 text-center text-[14px] text-ink-soft">
          Todavía no hay etiquetas. Puedes añadirlas al registrar o editar un
          libro.
        </p>
      ) : (
        <ul className="flex flex-wrap items-center gap-2.5">
          {rows.map((row) => {
            const scale = max > 0 ? 0.85 + (row.count / max) * 0.6 : 1;
            return (
              <li key={row.tag}>
                <Link
                  href={tagHref(row.tag)}
                  className="inline-flex items-baseline gap-2 border-2 border-line bg-surface px-3 py-1.5 font-semibold transition-colors hover:border-accent hover:text-accent"
                  style={{ fontSize: `${(13 * scale).toFixed(1)}px` }}
                >
                  {row.tag}
                  <span className="text-[12px] tabular-nums text-ink-faint">
                    {row.count}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
