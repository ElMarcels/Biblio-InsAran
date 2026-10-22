import Link from "next/link";
import { notFound } from "next/navigation";

import { BookCard } from "@/components/BookCard";
import { PageTransition } from "@/components/PageTransition";
import { Reveal } from "@/components/Reveal";
import { getT } from "@/lib/i18n/server";
import { onLoanCounts } from "@/lib/library";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const collection = await prisma.collection.findFirst({
    where: { slug, ownerReaderId: null },
    select: { name: true },
  });
  const t = await getT();
  return { title: collection ? collection.name : t("collections.listaNoEncontrada") };
}

export default async function CollectionPage({ params }: { params: Params }) {
  const { slug } = await params;
  const t = await getT();

  const collection = await prisma.collection.findFirst({
    where: { slug, ownerReaderId: null },
    include: {
      books: {
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        include: { book: true },
      },
    },
  });
  if (!collection) notFound();

  const books = collection.books.map((item) => item.book);
  const onLoan = await onLoanCounts(books.map((book) => book.id));

  return (
    <PageTransition>
      <div className="shell flex flex-1 flex-col py-10">
        <nav aria-label={t("collections.migasDePan")} className="mb-7 text-[13px] text-ink-faint">
          <Link
            href="/colecciones"
            transitionTypes={["nav-back"]}
            className="font-semibold text-ink underline underline-offset-2"
          >
            {t("collections.colecciones")}
          </Link>
          <span className="px-2">/</span>
          <span>{collection.name}</span>
        </nav>

        <header className="mb-9 animate-fade-in-up">
          <p className="micro mb-3">{t("collections.coleccion")}</p>
          <h1 className="font-display text-[36px] font-bold sm:text-[42px]">
            {collection.name}
          </h1>
          {collection.description ? (
            <p className="mt-3 max-w-2xl text-[15px] text-ink-soft">{collection.description}</p>
          ) : null}
          <p className="mt-4 text-[13px] tabular-nums text-ink-faint">
            {books.length === 1 ? t("collections.oneBook") : t("collections.nBooks", { n: books.length })}
          </p>
        </header>

        {books.length === 0 ? (
          <p className="border-2 border-dashed border-hairline bg-surface px-6 py-14 text-center text-[15px] text-ink-soft">
            {t("collections.estaListaTodaviaNoTieneLibros")}
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {books.map((book, index) => (
              <li key={book.id}>
                <Reveal delay={(index % 4) * 70}>
                  <BookCard
                    book={{
                      ...book,
                      available: Math.max(0, book.copies - (onLoan.get(book.id) ?? 0)),
                    }}
                  />
                </Reveal>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-9 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
          <Link href="/catalogo" className="btn-ghost">
            {t("collections.verTodoElCatalogo")}
          </Link>
        </p>
      </div>
    </PageTransition>
  );
}
