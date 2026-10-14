import Link from "next/link";
import { notFound } from "next/navigation";

import { BookCard } from "@/components/BookCard";
import { getT } from "@/lib/i18n/server";
import { onLoanCounts } from "@/lib/library";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const collection = await prisma.collection.findUnique({
    where: { slug },
    select: { name: true },
  });
  const t = await getT();
  return { title: collection ? collection.name : t("Lista no encontrada") };
}

export default async function CollectionPage({ params }: { params: Params }) {
  const { slug } = await params;
  const t = await getT();

  const collection = await prisma.collection.findUnique({
    where: { slug },
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
    <div className="shell flex flex-1 flex-col py-10">
      <nav aria-label={t("Migas de pan")} className="mb-7 text-[13px] text-ink-faint">
        <Link href="/colecciones" className="font-semibold text-ink underline underline-offset-2">
          {t("Colecciones")}
        </Link>
        <span className="px-2">/</span>
        <span>{collection.name}</span>
      </nav>

      <header className="mb-9">
        <p className="micro mb-3">{t("Colección")}</p>
        <h1 className="font-display text-[36px] font-bold sm:text-[42px]">
          {collection.name}
        </h1>
        {collection.description ? (
          <p className="mt-3 max-w-2xl text-[15px] text-ink-soft">{collection.description}</p>
        ) : null}
        <p className="mt-4 text-[13px] tabular-nums text-ink-faint">
          {books.length === 1 ? t("1 libro") : t("{n} libros", { n: books.length })}
        </p>
      </header>

      {books.length === 0 ? (
        <p className="border-2 border-dashed border-hairline bg-surface px-6 py-14 text-center text-[15px] text-ink-soft">
          {t("Esta lista todavía no tiene libros.")}
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {books.map((book) => (
            <li key={book.id}>
              <BookCard
                book={{
                  ...book,
                  available: Math.max(0, book.copies - (onLoan.get(book.id) ?? 0)),
                }}
              />
            </li>
          ))}
        </ul>
      )}

      <p className="mt-9">
        <Link href="/catalogo" className="btn-ghost">
          {t("Ver todo el catálogo")}
        </Link>
      </p>
    </div>
  );
}
