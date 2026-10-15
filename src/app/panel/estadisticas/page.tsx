import Link from "next/link";

import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("panel.stats.estadisticas") };
}

const DAY = 24 * 60 * 60 * 1000;

/** Cuántos libros mostramos como mucho en las listas largas. */
const LIST_LIMIT = 60;

function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="border-2 border-line bg-surface p-5">
      <p className="micro">{label}</p>
      <p className="mt-2 font-display text-[34px] font-bold leading-none tabular-nums">
        {value}
      </p>
      {hint ? <p className="mt-1.5 text-[12px] text-ink-faint">{hint}</p> : null}
    </div>
  );
}

/** Barra horizontal proporcional, para comparar volúmenes de un vistazo. */
function Bar({ value, max }: { value: number; max: number }) {
  const width = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-2 w-full min-w-[80px] border border-line bg-paper">
      <div className="h-full bg-accent" style={{ width: `${width}%` }} />
    </div>
  );
}

export default async function StatsPage() {
  await requireUser();
  const t = await getT();

  const now = new Date();
  const since30 = new Date(now.getTime() - 30 * DAY);
  const since365 = new Date(now.getTime() - 365 * DAY);

  const [
    totalBooks,
    copiesAgg,
    totalLoans,
    loans30,
    loans365,
    activeLoans,
    overdue,
    activeReaders,
    grouped,
    books,
  ] = await Promise.all([
    prisma.book.count(),
    prisma.book.aggregate({ _sum: { copies: true } }),
    prisma.loan.count(),
    prisma.loan.count({ where: { loanedAt: { gte: since30 } } }),
    prisma.loan.count({ where: { loanedAt: { gte: since365 } } }),
    prisma.loan.count({ where: { returnedAt: null } }),
    prisma.loan.count({ where: { returnedAt: null, dueAt: { lt: now } } }),
    prisma.reader.count({ where: { active: true } }),
    prisma.loan.groupBy({ by: ["bookId"], _count: { _all: true } }),
    prisma.book.findMany({
      select: {
        id: true,
        title: true,
        author: true,
        category: true,
        copies: true,
        createdAt: true,
      },
    }),
  ]);

  const totalCopies = copiesAgg._sum.copies ?? 0;

  const bookById = new Map(books.map((book) => [book.id, book]));
  const loansByBook = new Map(grouped.map((row) => [row.bookId, row._count._all]));

  // Libros más prestados.
  const topBooks = grouped
    .flatMap((row) => {
      const book = bookById.get(row.bookId);
      return book ? [{ book, count: row._count._all }] : [];
    })
    .sort((a, b) => b.count - a.count || a.book.title.localeCompare(b.book.title))
    .slice(0, 10);

  // Autorías con más préstamos.
  const byAuthor = new Map<string, { author: string; loans: number; titles: number }>();
  for (const [bookId, count] of loansByBook) {
    const book = bookById.get(bookId);
    if (!book) continue;
    const entry =
      byAuthor.get(book.author) ?? { author: book.author, loans: 0, titles: 0 };
    entry.loans += count;
    entry.titles += 1;
    byAuthor.set(book.author, entry);
  }
  const topAuthors = [...byAuthor.values()]
    .sort((a, b) => b.loans - a.loans || a.author.localeCompare(b.author))
    .slice(0, 10);

  // Préstamos por categoría.
  const byCategory = new Map<string, { category: string; loans: number; titles: number }>();
  for (const book of books) {
    const entry = byCategory.get(book.category) ?? {
      category: book.category,
      loans: 0,
      titles: 0,
    };
    entry.titles += 1;
    entry.loans += loansByBook.get(book.id) ?? 0;
    byCategory.set(book.category, entry);
  }
  const categories = [...byCategory.values()].sort((a, b) => b.loans - a.loans);

  // Libros que nunca se han prestado (criterio de expurgo).
  const neverLoaned = books
    .filter((book) => !loansByBook.has(book.id))
    .sort((a, b) => a.title.localeCompare(b.title));
  const neverLoanedCopies = neverLoaned.reduce((sum, book) => sum + book.copies, 0);
  const neverLoanedPercent =
    totalBooks > 0 ? Math.round((neverLoaned.length / totalBooks) * 100) : 0;

  const rotation = totalCopies > 0 ? totalLoans / totalCopies : 0;
  const maxBook = topBooks[0]?.count ?? 0;
  const maxAuthor = topAuthors[0]?.loans ?? 0;
  const maxCategory = categories[0]?.loans ?? 0;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="font-display text-[26px] font-bold">{t("panel.stats.estadisticas")}</h2>
        <p className="mt-1 max-w-2xl text-[14px] text-ink-soft">
          {t(
            "panel.stats.comoSeUsaElFondoPrestamosAutoriasMasLeidasYLibrosQueNuncaCircula",
          )}
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatTile
          label={t("panel.stats.prestamosTotales")}
          value={totalLoans}
          hint={t("panel.stats.nEnLosUltimos30Dias", { n: loans30 })}
        />
        <StatTile
          label={t("panel.stats.rotacionDelFondo")}
          value={rotation.toFixed(1)}
          hint={t("panel.stats.prestamosPorEjemplar")}
        />
        <StatTile
          label={t("panel.stats.librosNuncaPrestados")}
          value={neverLoaned.length}
          hint={t("panel.stats.nDelFondoCopiesEjemplares", {
            n: neverLoanedPercent,
            copies: neverLoanedCopies,
          })}
        />
        <StatTile
          label={t("panel.stats.enPrestamo")}
          value={activeLoans}
          hint={t(overdue === 1 ? "panel.nVencido" : "panel.nVencidos", { n: overdue })}
        />
        <StatTile
          label={t("panel.stats.prestamosEn12Meses")}
          value={loans365}
          hint={t("panel.stats.actividadDelUltimoAno")}
        />
        <StatTile
          label={t("panel.stats.lectoresActivos")}
          value={activeReaders}
          hint={t("panel.stats.carnesEnVigor")}
        />
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="border-2 border-line bg-surface">
          <h3 className="border-b-2 border-line bg-paper px-4 py-3 font-display text-[18px] font-bold">
            {t("panel.stats.librosMasPrestados")}
          </h3>
          {topBooks.length === 0 ? (
            <p className="px-4 py-6 text-center text-[13.5px] text-ink-faint">
              {t("panel.stats.todaviaNoSeHaRegistradoNingunPrestamo")}
            </p>
          ) : (
            <ul className="divide-y divide-hairline">
              {topBooks.map((row) => (
                <li key={row.book.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="w-6 shrink-0 text-right font-mono text-[13px] text-ink-faint tabular-nums">
                    {row.count}
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/libro/${row.book.id}`}
                      className="block truncate font-semibold hover:text-accent"
                    >
                      {row.book.title}
                    </Link>
                    <p className="truncate text-[13px] text-ink-faint">
                      {row.book.author}
                    </p>
                    <div className="mt-1.5">
                      <Bar value={row.count} max={maxBook} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="border-2 border-line bg-surface">
          <h3 className="border-b-2 border-line bg-paper px-4 py-3 font-display text-[18px] font-bold">
            {t("panel.stats.autoriasMasPrestadas")}
          </h3>
          {topAuthors.length === 0 ? (
            <p className="px-4 py-6 text-center text-[13.5px] text-ink-faint">
              {t("panel.stats.todaviaNoSeHaRegistradoNingunPrestamo")}
            </p>
          ) : (
            <ul className="divide-y divide-hairline">
              {topAuthors.map((row) => (
                <li key={row.author} className="flex items-center gap-3 px-4 py-3">
                  <span className="w-6 shrink-0 text-right font-mono text-[13px] text-ink-faint tabular-nums">
                    {row.loans}
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/autor/${encodeURIComponent(row.author)}`}
                      className="block truncate font-semibold hover:text-accent"
                    >
                      {row.author}
                    </Link>
                    <p className="text-[13px] text-ink-faint">
                      {t(row.titles === 1 ? "panel.stats.oneTitle" : "panel.stats.nTitles", {
                        n: row.titles,
                      })}
                    </p>
                    <div className="mt-1.5">
                      <Bar value={row.loans} max={maxAuthor} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="border-2 border-line bg-surface">
        <h3 className="border-b-2 border-line bg-paper px-4 py-3 font-display text-[18px] font-bold">
          {t("panel.stats.prestamosPorCategoria")}
        </h3>
        {categories.length === 0 ? (
          <p className="px-4 py-6 text-center text-[13.5px] text-ink-faint">
            {t("panel.stats.elCatalogoTodaviaNoTieneTitulos")}
          </p>
        ) : (
          <ul className="divide-y divide-hairline">
            {categories.map((row) => (
              <li key={row.category} className="flex items-center gap-4 px-4 py-3">
                <Link
                  href={`/catalogo?categoria=${encodeURIComponent(row.category)}`}
                  className="min-w-[140px] font-semibold hover:text-accent"
                >
                  {row.category}
                </Link>
                <div className="flex-1">
                  <Bar value={row.loans} max={maxCategory} />
                </div>
                <span className="w-10 shrink-0 text-right text-[13px] tabular-nums text-ink-soft">
                  {row.loans}
                </span>
                <span className="hidden w-20 shrink-0 text-right text-[12px] tabular-nums text-ink-faint sm:block">
                  {t("panel.stats.nTitles", { n: row.titles })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border-2 border-line bg-surface">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b-2 border-line bg-paper px-4 py-3">
          <h3 className="font-display text-[18px] font-bold">
            {t("panel.stats.librosNuncaPrestados")}
          </h3>
          <span className="border-2 border-line px-2 py-0.5 text-[12px] font-bold tabular-nums">
            {neverLoaned.length}
          </span>
          <p className="w-full text-[13px] text-ink-soft sm:w-auto sm:pl-2">
            {t("panel.stats.candidatosAlExpurgoConvieneRevisarlosAntesDeDarlosDeBaja")}
          </p>
        </div>
        {neverLoaned.length === 0 ? (
          <p className="px-4 py-6 text-center text-[13.5px] text-ink-faint">
            {t("panel.stats.todoElFondoTieneAlMenosUnPrestamoRegistrado")}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line">
                  <th scope="col" className="px-4 py-2 text-[12px] font-semibold uppercase tracking-wide">{t("panel.stats.titulo")}</th>
                  <th scope="col" className="px-4 py-2 text-[12px] font-semibold uppercase tracking-wide">{t("panel.stats.categoria")}</th>
                  <th scope="col" className="px-4 py-2 text-right text-[12px] font-semibold uppercase tracking-wide">{t("panel.stats.ej")}</th>
                  <th scope="col" className="px-4 py-2 text-[12px] font-semibold uppercase tracking-wide">{t("panel.stats.incorporado")}</th>
                </tr>
              </thead>
              <tbody>
                {neverLoaned.slice(0, LIST_LIMIT).map((book) => (
                  <tr key={book.id} className="border-b border-hairline last:border-b-0">
                    <td className="px-4 py-2.5">
                      <Link href={`/libro/${book.id}`} className="font-semibold hover:text-accent">
                        {book.title}
                      </Link>
                      <p className="text-[13px] text-ink-faint">{book.author}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="tag-muted">{book.category}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-[14px] tabular-nums">
                      {book.copies}
                    </td>
                    <td className="px-4 py-2.5 text-[13px] text-ink-faint tabular-nums">
                      {formatDate(book.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {neverLoaned.length > LIST_LIMIT ? (
              <p className="px-4 py-3 text-[13px] text-ink-faint">
                {t("panel.stats.seMuestranLosPrimerosNTitulos", { n: LIST_LIMIT })}
              </p>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
