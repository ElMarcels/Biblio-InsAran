import type { Prisma } from "@prisma/client";
import Link from "next/link";

import { DeleteBookButton } from "@/components/DeleteBookButton";
import { EmptyState } from "@/components/EmptyState";
import { Notice } from "@/components/Notice";
import { PageTransition } from "@/components/PageTransition";
import { Pagination } from "@/components/Pagination";
import { requireUser } from "@/lib/auth";
import { PANEL_PAGE_SIZE } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import type { TranslationKey } from "@/lib/i18n/translate";
import { prisma } from "@/lib/prisma";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("panel.books.libros") };
}

const FLASH: Record<string, { tone: "success"; text: TranslationKey }> = {
  creado: { tone: "success", text: "panel.books.flashCreated" },
  editado: { tone: "success", text: "panel.books.flashSaved" },
};

function one(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function PanelBooksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser();
  const t = await getT();
  const params = await searchParams;
  const query = one(params.q).trim();
  const aviso = one(params.aviso);
  const requestedPage = Math.max(1, Number.parseInt(one(params.pagina) || "1", 10) || 1);

  const where: Prisma.BookWhereInput = query
    ? {
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { author: { contains: query, mode: "insensitive" } },
          { isbn: { contains: query, mode: "insensitive" } },
        ],
      }
    : {};

  const total = await prisma.book.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / PANEL_PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);

  const books = await prisma.book.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    skip: (page - 1) * PANEL_PAGE_SIZE,
    take: PANEL_PAGE_SIZE,
  });

  const hrefFor = (targetPage: number) => {
    const search = new URLSearchParams();
    if (query) search.set("q", query);
    if (targetPage > 1) search.set("pagina", String(targetPage));
    const suffix = search.toString();
    return suffix ? `/panel/libros?${suffix}` : "/panel/libros";
  };

  const flash = FLASH[aviso];

  return (
    <PageTransition>
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-[26px] font-bold">{t("panel.books.librosDelCatalogo")}</h2>
          <p className="mt-1 text-[14px] text-ink-soft tabular-nums">
            {total === 1 ? t("panel.books.oneTitle") : t("panel.books.nTitles", { n: total })}
            {query ? t("panel.books.paraQuery", { query }) : ""}
          </p>
        </div>
        <Link href="/panel/libros/nuevo" className="btn-primary">
          {t("panel.books.anadirLibro")}
        </Link>
      </div>

      {flash ? <Notice tone={flash.tone}>{t(flash.text)}</Notice> : null}

      <form action="/panel/libros" method="get" className="flex flex-wrap items-end gap-3 border-2 border-line bg-surface p-4">
        <div className="min-w-56 flex-1">
          <label htmlFor="q" className="label">
            {t("panel.books.buscarEnElFondo")}
          </label>
          <input
            id="q"
            name="q"
            defaultValue={query}
            className="input"
            placeholder={t("panel.books.tituloAutoriaOISBN")}
            autoComplete="off"
          />
        </div>
        <button type="submit" className="btn-primary">
          {t("panel.books.buscar")}
        </button>
        {query ? (
          <Link href="/panel/libros" className="btn-ghost">
            {t("panel.books.limpiar")}
          </Link>
        ) : null}
      </form>

      {books.length === 0 ? (
        <EmptyState
          title={query ? t("panel.books.sinResultados") : t("panel.books.aunNoHayLibros")}
          description={
            query
              ? t("panel.books.noHayTitulosQueCoincidanConEsaBusqueda")
              : t("panel.books.anadeElPrimerLibroParaEmpezarAConstruirElCatalogo")
          }
          action={
            query ? (
              <Link href="/panel/libros" className="btn-outline">
                {t("panel.books.verTodos")}
              </Link>
            ) : (
              <Link href="/panel/libros/nuevo" className="btn-primary">
                {t("panel.books.anadirLibro")}
              </Link>
            )
          }
        />
      ) : (
        <div className="overflow-x-auto border-2 border-line bg-surface">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <caption className="sr-only">{t("panel.books.listadoDeLibrosDelCatalogo")}</caption>
            <thead>
              <tr className="border-b-2 border-line bg-paper">
                <th scope="col" className="px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide">
                  {t("panel.books.titulo")}
                </th>
                <th scope="col" className="px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide">
                  {t("panel.books.categoria")}
                </th>
                <th scope="col" className="px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide">
                  {t("panel.books.ano")}
                </th>
                <th scope="col" className="px-4 py-2.5 text-right text-[12px] font-semibold uppercase tracking-wide">
                  {t("panel.books.ej")}
                </th>
                <th scope="col" className="px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide">
                  {t("panel.books.ubic")}
                </th>
                <th scope="col" className="px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide">
                  {t("panel.books.registro")}
                </th>
                <th scope="col" className="px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide">
                  {t("panel.books.cDU")}
                </th>
                <th scope="col" className="px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide">
                  {t("panel.books.actualizado")}
                </th>
                <th scope="col" className="px-4 py-2.5 text-right text-[12px] font-semibold uppercase tracking-wide">
                  {t("panel.books.acciones")}
                </th>
              </tr>
            </thead>
            <tbody>
              {books.map((book) => (
                <tr key={book.id} className="border-b border-hairline last:border-b-0 align-top">
                  <td className="px-4 py-3">
                    <Link href={`/libro/${book.id}`} className="font-semibold hover:text-accent">
                      {book.title}
                    </Link>
                    <p className="text-[13px] text-ink-faint">{book.author}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="tag-muted">{book.category}</span>
                  </td>
                  <td className="px-4 py-3 text-[14px] tabular-nums">{book.year ?? "—"}</td>
                  <td className="px-4 py-3 text-right text-[14px] tabular-nums">{book.copies}</td>
                  <td className="px-4 py-3 font-mono text-[13px]">{book.location ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-[13px]">{book.recordNumber ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-[13px]">{book.cdu ?? "—"}</td>
                  <td className="px-4 py-3 text-[13px] text-ink-faint tabular-nums">
                    {formatDate(book.updatedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      <Link href={`/panel/libros/${book.id}/editar`} className="btn-outline btn-sm">
                        {t("panel.books.editar")}
                      </Link>
                      <DeleteBookButton bookId={book.id} title={book.title} compact />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex justify-center">
          <Pagination page={page} totalPages={totalPages} hrefFor={hrefFor} />
        </div>
      ) : null}
    </div>
    </PageTransition>
  );
}
