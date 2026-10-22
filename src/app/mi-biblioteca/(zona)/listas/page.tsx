import Link from "next/link";
import { redirect } from "next/navigation";

import { EmptyState } from "@/components/EmptyState";
import { PageTransition } from "@/components/PageTransition";
import {
  CreateReaderListForm,
  DeleteReaderListButton,
  RemoveFromListButton,
} from "@/components/reader/ReaderListActions";
import { getT } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";
import { requireReader } from "@/lib/reader-auth";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("reader.tabLists") };
}

/**
 * Listas de lectura de la persona lectora. Son privadas: las gestiona ella
 * misma desde «Mi biblioteca» (no aparecen en las listas curadas del
 * catálogo ni en el panel).
 */
export default async function ReaderListsPage() {
  const session = await requireReader();
  const t = await getT();

  const reader = await prisma.reader.findUnique({
    where: { id: session.id },
    select: { id: true },
  });
  if (!reader) redirect("/mi-biblioteca");

  const lists = await prisma.collection.findMany({
    where: { ownerReaderId: reader.id },
    orderBy: { createdAt: "asc" },
    include: {
      books: {
        orderBy: { position: "asc" },
        include: {
          book: {
            select: { id: true, title: true, author: true, category: true },
          },
        },
      },
    },
  });

  return (
    <PageTransition>
      <div className="flex flex-col gap-6">
        <header>
          <h2 className="font-display text-[26px] font-bold">{t("reader.myLists")}</h2>
          <p className="mt-1 max-w-3xl text-[14px] text-ink-soft">
            {t("reader.listsLead")}
          </p>
        </header>

        {lists.length === 0 ? (
          <EmptyState
            title={t("reader.noLists")}
            description={t("reader.noListsLead")}
            action={
              <Link href="/catalogo" className="btn-outline">
                {t("book.catalogo")}
              </Link>
            }
          />
        ) : (
          <ul className="flex flex-col gap-6">
            {lists.map((list) => (
              <li key={list.id} className="border-2 border-line bg-surface">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 border-b-2 border-line bg-paper px-4 py-3">
                  <h3 className="font-display text-[19px] font-bold">{list.name}</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-[12.5px] font-semibold tabular-nums text-ink-faint">
                      {list.books.length === 1
                        ? t("reader.oneBook")
                        : t("reader.listBooksN", { n: list.books.length })}
                    </span>
                    <DeleteReaderListButton listId={list.id} />
                  </div>
                </div>

                {list.books.length === 0 ? (
                  <p className="px-4 py-6 text-center text-[13.5px] text-ink-faint">
                    {t("reader.listEmpty")}
                  </p>
                ) : (
                  <ul className="divide-y divide-hairline">
                    {list.books.map((item) => (
                      <li
                        key={item.bookId}
                        className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3"
                      >
                        <div className="min-w-[200px] flex-1">
                          <Link
                            href={`/libro/${item.book.id}`}
                            className="font-semibold hover:text-accent"
                          >
                            {item.book.title}
                          </Link>
                          <p className="text-[13px] text-ink-faint">{item.book.author}</p>
                        </div>
                        <span className="border-2 border-line px-2 py-0.5 text-[12px] font-semibold">
                          {item.book.category}
                        </span>
                        <RemoveFromListButton listId={list.id} bookId={item.book.id} />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}

        <section className="border-2 border-line bg-surface p-6">
          <h3 className="font-display text-[19px] font-bold">{t("reader.newList")}</h3>
          <div className="mt-4 max-w-md">
            <CreateReaderListForm />
          </div>
        </section>
      </div>
    </PageTransition>
  );
}
