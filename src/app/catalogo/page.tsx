import type { Prisma } from "@prisma/client";
import Link from "next/link";

import { BookCard } from "@/components/BookCard";
import { EmptyState } from "@/components/EmptyState";
import { PageTransition } from "@/components/PageTransition";
import { Pagination } from "@/components/Pagination";
import { Reveal } from "@/components/Reveal";
import { CATEGORIES, LANGUAGES } from "@/lib/catalog";
import { CATALOG_PAGE_SIZE } from "@/lib/constants";
import { getT } from "@/lib/i18n/server";
import type { TranslationKey } from "@/lib/i18n/translate";
import { onLoanCounts } from "@/lib/library";
import { prisma } from "@/lib/prisma";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("catalog.catalogo") };
}

const SORTS = {
  recientes: { label: "catalog.incorporacionReciente", orderBy: [{ createdAt: "desc" }] },
  titulo: { label: "catalog.tituloAZ", orderBy: [{ title: "asc" }] },
  autor: { label: "catalog.autoriaAZ", orderBy: [{ author: "asc" }] },
  ejemplares: { label: "catalog.masEjemplares", orderBy: [{ copies: "desc" }] },
} satisfies Record<string, { label: TranslationKey; orderBy: Prisma.BookOrderByWithRelationInput[] }>;

type SortKey = keyof typeof SORTS;

type SearchParams = Record<string, string | string[] | undefined>;

function one(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const t = await getT();

  const query = one(params.q).trim();
  const category = one(params.categoria);
  const language = one(params.idioma);
  const tag = one(params.etiqueta).trim();
  const sortKey = (one(params.orden) || "recientes") as SortKey;
  const sort = SORTS[sortKey] ?? SORTS.recientes;
  const requestedPage = Math.max(1, Number.parseInt(one(params.pagina) || "1", 10) || 1);

  const where: Prisma.BookWhereInput = {};
  if (query) {
    where.OR = [
      { title: { contains: query, mode: "insensitive" } },
      { author: { contains: query, mode: "insensitive" } },
      { isbn: { contains: query, mode: "insensitive" } },
      { publisher: { contains: query, mode: "insensitive" } },
    ];
  }
  if (category && (CATEGORIES as readonly string[]).includes(category)) {
    where.category = category;
  }
  if (language && (LANGUAGES as readonly string[]).includes(language)) {
    where.language = language;
  }
  if (tag) {
    where.tags = { has: tag };
  }

  const total = await prisma.book.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / CATALOG_PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);

  const books = await prisma.book.findMany({
    where,
    orderBy: sort.orderBy,
    skip: (page - 1) * CATALOG_PAGE_SIZE,
    take: CATALOG_PAGE_SIZE,
  });

  const onLoan = await onLoanCounts(books.map((book) => book.id));

  const hasFilters = Boolean(query || category || language || tag);

  const hrefFor = (targetPage: number) => {
    const search = new URLSearchParams();
    if (query) search.set("q", query);
    if (category) search.set("categoria", category);
    if (language) search.set("idioma", language);
    if (tag) search.set("etiqueta", tag);
    if (sortKey !== "recientes") search.set("orden", sortKey);
    if (targetPage > 1) search.set("pagina", String(targetPage));
    const suffix = search.toString();
    return suffix ? `/catalogo?${suffix}` : "/catalogo";
  };

  const clearHref = sortKey !== "recientes" ? `/catalogo?orden=${sortKey}` : "/catalogo";

  return (
    <PageTransition>
      <div className="shell flex flex-1 flex-col py-10">
        <header className="mb-8 animate-fade-in-up">
          <p className="micro mb-3">{t("catalog.catalogo")}</p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="font-display text-[38px] font-bold sm:text-[46px]">
            {category
              ? category
              : tag
                ? t("catalog.materiaTag", { tag })
                : query
                  ? t("catalog.resultadosDeQuery", { query })
                  : t("catalog.todoElFondo")}
          </h1>
          <p className="text-[14px] text-ink-soft tabular-nums">
            {total === 1 ? t("catalog.oneTitle") : t("catalog.nTitles", { n: total })}
            {hasFilters
              ? t("catalog.conLosFiltrosAplicados")
              : t("catalog.enLaColeccion")}
          </p>
        </div>
      </header>

      <form
        action="/catalogo"
        method="get"
        className="mb-8 grid animate-fade-in-up gap-3 border-2 border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]"
        style={{ animationDelay: "80ms" }}
      >
        <div className="sm:col-span-2 lg:col-span-1">
          <label htmlFor="q" className="label">
            {t("catalog.busqueda")}
          </label>
          <input
            id="q"
            name="q"
            defaultValue={query}
            className="input"
            placeholder={t("catalog.tituloAutoriaISBN")}
            autoComplete="off"
          />
        </div>

        <div>
          <label htmlFor="categoria" className="label">
            {t("catalog.categoria")}
          </label>
          <select id="categoria" name="categoria" defaultValue={category} className="input">
            <option value="">{t("catalog.todas")}</option>
            {CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="idioma" className="label">
            {t("catalog.idioma")}
          </label>
          <select id="idioma" name="idioma" defaultValue={language} className="input">
            <option value="">{t("catalog.todos")}</option>
            {LANGUAGES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="etiqueta" className="label">
            {t("catalog.materia")}
          </label>
          <input
            id="etiqueta"
            name="etiqueta"
            defaultValue={tag}
            className="input"
            placeholder={t("catalog.novelaNegra")}
            autoComplete="off"
          />
        </div>

        <div>
          <label htmlFor="orden" className="label">
            {t("catalog.ordenarPor")}
          </label>
          <select id="orden" name="orden" defaultValue={sortKey} className="input">
            {Object.entries(SORTS).map(([key, value]) => (
              <option key={key} value={key}>
                {t(value.label)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end gap-2">
          <button type="submit" className="btn-primary">
            {t("catalog.filtrar")}
          </button>
          {hasFilters || sortKey !== "recientes" ? (
            <Link href={clearHref} className="btn-ghost">
              {t("catalog.limpiar")}
            </Link>
          ) : null}
        </div>
      </form>

      {books.length === 0 ? (
        <EmptyState
          title={hasFilters ? t("catalog.sinResultados") : t("catalog.aunNoHayLibros")}
          description={
            hasFilters
              ? t(
                  "catalog.noSeHaEncontradoNingunTituloConEsosCriteriosPruebaAQuitarAlgunFi",
                )
              : t("catalog.elCatalogoTodaviaNoTieneTitulosRegistrados")
          }
          action={
            hasFilters ? (
              <Link href={clearHref} className="btn-outline">
                {t("catalog.quitarFiltros")}
              </Link>
            ) : undefined
          }
        />
      ) : (
        <ul className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {books.map((book, index) => (
            <li key={book.id}>
              <Reveal delay={(index % 4) * 70}>
                <BookCard
                  book={{
                    ...book,
                    available: Math.max(
                      0,
                      book.copies - (onLoan.get(book.id) ?? 0),
                    ),
                  }}
                />
              </Reveal>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 ? (
        <div className="mt-10 flex justify-center">
          <Pagination page={page} totalPages={totalPages} hrefFor={hrefFor} />
        </div>
      ) : null}
      </div>
    </PageTransition>
  );
}
