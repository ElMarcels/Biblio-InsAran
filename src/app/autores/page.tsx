import Link from "next/link";

import { getT } from "@/lib/i18n/server";
import { authorHref, authorKey } from "@/lib/library";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Autorías" };

export default async function AuthorsPage() {
  const [groups, t] = await Promise.all([
    prisma.book.groupBy({
      by: ["author"],
      _count: { _all: true },
    }),
    getT(),
  ]);

  // Agrupa sin distinguir mayúsculas: "Pere Calders" y "pere calders" son la
  // misma persona.
  const merged = new Map<string, { name: string; count: number }>();
  for (const group of groups) {
    const key = authorKey(group.author);
    const existing = merged.get(key);
    if (existing) {
      existing.count += group._count._all;
    } else {
      merged.set(key, { name: group.author.trim(), count: group._count._all });
    }
  }

  const authors = Array.from(merged.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "es"),
  );

  return (
    <div className="shell flex flex-1 flex-col py-10">
      <header className="mb-8">
        <p className="micro mb-3">{t("Autorías")}</p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="font-display text-[38px] font-bold sm:text-[46px]">
            {t("Quién escribe en la biblioteca")}
          </h1>
          <p className="text-[14px] text-ink-soft tabular-nums">
            {authors.length === 1 ? t("1 autoría") : t("{n} autorías", { n: authors.length })}
          </p>
        </div>
        <p className="mt-3 max-w-2xl text-[14px] text-ink-soft">
          {t(
            "Las autorías se crean solas a partir de los libros del catálogo: al registrar un libro nuevo, su autoría aparece aquí automáticamente.",
          )}
        </p>
      </header>

      {authors.length === 0 ? (
        <p className="border-2 border-dashed border-hairline bg-surface p-10 text-center text-[14px] text-ink-soft">
          {t("Todavía no hay autorías registradas.")}
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {authors.map((author) => (
            <li key={author.name}>
              <Link
                href={authorHref(author.name)}
                className="flex items-baseline justify-between gap-4 border-2 border-line bg-surface px-4 py-3 transition-colors hover:border-accent hover:text-accent"
              >
                <span className="font-display text-[16px] font-semibold">
                  {author.name}
                </span>
                <span className="text-[13px] tabular-nums text-ink-faint">
                  {author.count === 1
                    ? t("1 título")
                    : t("{n} títulos", { n: author.count })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
