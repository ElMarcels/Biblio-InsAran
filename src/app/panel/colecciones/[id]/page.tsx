import Link from "next/link";
import { notFound } from "next/navigation";

import { BookCover } from "@/components/BookCover";
import { EmptyState } from "@/components/EmptyState";
import { CollectionForm } from "@/components/forms/CollectionForm";
import { DeleteCollectionButton } from "@/components/panel/DeleteCollectionButton";
import {
  addBookToCollectionAction,
  moveBookInCollectionAction,
  removeBookFromCollectionAction,
} from "@/lib/actions/collections";
import { isManagerRole, requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";
import { PageTransition } from "@/components/PageTransition";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { id } = await params;
  const collection = await prisma.collection.findUnique({
    where: { id },
    select: { name: true },
  });
  const t = await getT();
  return { title: collection ? collection.name : t("panel.collections.listaNoEncontrada") };
}

function one(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function CollectionDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const t = await getT();
  const query = one((await searchParams).q).trim();

  const collection = await prisma.collection.findUnique({
    where: { id },
    include: {
      books: {
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        include: {
          book: {
            select: {
              id: true,
              title: true,
              author: true,
              category: true,
              coverUrl: true,
            },
          },
        },
      },
    },
  });
  if (!collection) notFound();

  const results = query
    ? await prisma.book.findMany({
        where: {
          AND: [
            { NOT: { collections: { some: { collectionId: id } } } },
            {
              OR: [
                { title: { contains: query, mode: "insensitive" } },
                { author: { contains: query, mode: "insensitive" } },
              ],
            },
          ],
        },
        orderBy: { title: "asc" },
        take: 15,
        select: { id: true, title: true, author: true },
      })
    : [];

  return (
    <PageTransition>
    <div className="flex flex-col gap-6">
      <nav aria-label={t("panel.collections.migasDePan")} className="text-[13px] text-ink-faint">
        <Link href="/panel/colecciones" className="font-semibold text-ink underline underline-offset-2">
          {t("panel.collections.listasCuradas")}
        </Link>
        <span className="px-2">/</span>
        <span>{collection.name}</span>
      </nav>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-[26px] font-bold">{collection.name}</h2>
          <p className="mt-1 text-[14px] text-ink-soft tabular-nums">
            {collection.books.length === 1
              ? t("panel.collections.oneInList")
              : t("panel.collections.nInList", { n: collection.books.length })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/colecciones/${collection.slug}`} className="btn-outline" target="_blank" rel="noreferrer">
            {t("panel.collections.verEnElCatalogo")}
          </Link>
          {isManagerRole(user.role) ? (
            <DeleteCollectionButton collectionId={collection.id} name={collection.name} />
          ) : null}
        </div>
      </div>

      <section className="border-2 border-line bg-surface p-6">
        <h3 className="micro mb-4">{t("panel.collections.datosDeLaLista")}</h3>
        <CollectionForm
          mode="edit"
          backHref="/panel/colecciones"
          values={{
            id: collection.id,
            name: collection.name,
            description: collection.description ?? "",
          }}
        />
      </section>

      <section className="border-2 border-line bg-surface">
        <div className="border-b-2 border-line p-5">
          <h3 className="micro mb-3">{t("panel.collections.buscarLibrosParaAnadir")}</h3>
          <form method="get" className="flex flex-wrap items-end gap-2.5">
            <div className="min-w-[220px] flex-1">
              <label className="label" htmlFor="q">
                {t("panel.collections.tituloOAutoria")}
              </label>
              <input
                id="q"
                name="q"
                defaultValue={query}
                className="input"
                placeholder={t("panel.collections.buscarEnElCatalogo")}
              />
            </div>
            <button type="submit" className="btn-outline">
              {t("panel.collections.buscar")}
            </button>
            {query ? (
              <Link href={`/panel/colecciones/${collection.id}`} className="btn-ghost">
                {t("panel.collections.quitarFiltros")}
              </Link>
            ) : null}
          </form>

          {query ? (
            results.length === 0 ? (
              <p className="mt-4 text-[13px] text-ink-faint">
                {t("panel.collections.noHayMasLibrosQueCoincidanConEsaBusqueda")}
              </p>
            ) : (
              <ul className="mt-4 flex flex-col divide-y divide-hairline border-t border-hairline">
                {results.map((book) => (
                  <li key={book.id} className="flex flex-wrap items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{book.title}</p>
                      <p className="text-[13px] text-ink-faint">{book.author}</p>
                    </div>
                    <form action={addBookToCollectionAction}>
                      <input type="hidden" name="collectionId" value={collection.id} />
                      <input type="hidden" name="bookId" value={book.id} />
                      <button type="submit" className="btn-outline btn-sm">
                        {t("panel.collections.anadirALaLista")}
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )
          ) : (
            <p className="mt-3 text-[13px] text-ink-faint">
              {t("panel.collections.escribeUnTituloOUnaAutoriaParaBuscarEnElCatalogo")}
            </p>
          )}
        </div>

        {collection.books.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title={t("panel.collections.laListaEstaVacia")}
              description={t("panel.collections.buscaLibrosArribaParaIrAnadiendolosALaLista")}
            />
          </div>
        ) : (
          <ol className="divide-y divide-hairline">
            {collection.books.map((item, index) => (
              <li key={item.bookId} className="flex flex-wrap items-center gap-4 p-4">
                <span className="micro w-6 shrink-0 tabular-nums">{index + 1}</span>
                <span className="w-[52px] shrink-0">
                  <BookCover
                    title={item.book.title}
                    author={item.book.author}
                    category={item.book.category}
                    src={item.book.coverUrl}
                    size="sm"
                  />
                </span>
                <div className="min-w-[180px] flex-1">
                  <Link
                    href={`/libro/${item.book.id}`}
                    className="font-semibold hover:text-accent"
                  >
                    {item.book.title}
                  </Link>
                  <p className="text-[13px] text-ink-faint">{item.book.author}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <form action={moveBookInCollectionAction}>
                    <input type="hidden" name="collectionId" value={collection.id} />
                    <input type="hidden" name="bookId" value={item.bookId} />
                    <input type="hidden" name="direction" value="up" />
                    <button
                      type="submit"
                      className="btn-ghost btn-sm"
                      aria-label={t("panel.collections.subirTitle", { title: item.book.title })}
                      disabled={index === 0}
                    >
                      ↑
                    </button>
                  </form>
                  <form action={moveBookInCollectionAction}>
                    <input type="hidden" name="collectionId" value={collection.id} />
                    <input type="hidden" name="bookId" value={item.bookId} />
                    <input type="hidden" name="direction" value="down" />
                    <button
                      type="submit"
                      className="btn-ghost btn-sm"
                      aria-label={t("panel.collections.bajarTitle", { title: item.book.title })}
                      disabled={index === collection.books.length - 1}
                    >
                      ↓
                    </button>
                  </form>
                  <form action={removeBookFromCollectionAction}>
                    <input type="hidden" name="collectionId" value={collection.id} />
                    <input type="hidden" name="bookId" value={item.bookId} />
                    <button type="submit" className="btn-outline btn-sm text-danger">
                      {t("panel.collections.quitar")}
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
    </PageTransition>
  );
}
