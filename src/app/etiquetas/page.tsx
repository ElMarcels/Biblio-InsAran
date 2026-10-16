import Link from "next/link";

import { PageTransition } from "@/components/PageTransition";
import { getT } from "@/lib/i18n/server";
import { tagHref } from "@/lib/library";
import { prisma } from "@/lib/prisma";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("tags.materias") };
}

export default async function TagsPage() {
  const [rows, t] = await Promise.all([
    prisma.$queryRaw<Array<{ tag: string; count: number }>>`
      SELECT unnest(tags) AS tag, count(*)::int AS count
      FROM "Book"
      GROUP BY tag
      ORDER BY count DESC, tag ASC
    `,
    getT(),
  ]);

  const max = rows.reduce((top, row) => Math.max(top, row.count), 0);

  return (
    <PageTransition>
      <div className="shell flex flex-1 flex-col py-10">
        <header className="mb-8 animate-fade-in-up">
          <p className="micro mb-3">{t("tags.materias")}</p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="font-display text-[38px] font-bold sm:text-[46px]">
            {t("tags.etiquetasDelCatalogo")}
          </h1>
          <p className="text-[14px] text-ink-soft tabular-nums">
            {rows.length === 1 ? t("tags.oneTag") : t("tags.nTags", { n: rows.length })}
          </p>
        </div>
        <p className="mt-3 max-w-2xl text-[14px] text-ink-soft">
          {t(
            "tags.materiasLibresQueElPersonalAnadeACadaLibroElTamanoIndicaCuantosT",
          )}
        </p>
      </header>

      {rows.length === 0 ? (
        <p className="border-2 border-dashed border-hairline bg-surface p-10 text-center text-[14px] text-ink-soft">
          {t("tags.todaviaNoHayEtiquetasPuedesAnadirlasAlRegistrarOEditarUnLibro")}
        </p>
      ) : (
        <ul className="flex flex-wrap items-center gap-2.5">
          {rows.map((row, index) => {
            const scale = max > 0 ? 0.85 + (row.count / max) * 0.6 : 1;
            return (
              <li key={row.tag}>
                <Link
                  href={tagHref(row.tag)}
                  className="animate-pop inline-flex items-baseline gap-2 border-2 border-line bg-surface px-3 py-1.5 font-semibold transition-[transform,border-color,color,box-shadow] duration-150 hover:-translate-y-[2px] hover:border-accent hover:text-accent hover:shadow-[3px_3px_0_0_var(--color-line)]"
                  style={{
                    fontSize: `${(13 * scale).toFixed(1)}px`,
                    animationDelay: `${Math.min(index * 35, 700)}ms`,
                  }}
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
    </PageTransition>
  );
}
