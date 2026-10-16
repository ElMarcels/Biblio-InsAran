import Link from "next/link";
import { notFound } from "next/navigation";

import { BookCard } from "@/components/BookCard";
import { PageTransition } from "@/components/PageTransition";
import { Reveal } from "@/components/Reveal";
import { getT } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ nombre: string }>;

function decodeName(value: string): string {
  try {
    return decodeURIComponent(value).trim();
  } catch {
    return value.trim();
  }
}

export async function generateMetadata({ params }: { params: Params }) {
  const { nombre } = await params;
  return { title: `${decodeName(nombre)} · Autoría` };
}

export default async function AuthorPage({ params }: { params: Params }) {
  const { nombre } = await params;
  const name = decodeName(nombre);
  if (!name) notFound();

  const books = await prisma.book.findMany({
    where: { author: { equals: name, mode: "insensitive" } },
    orderBy: [{ title: "asc" }],
  });

  if (books.length === 0) notFound();

  // Nombre tal y como aparece en el primer libro (respeta mayúsculas reales).
  const displayName = books[0]!.author.trim();
  const t = await getT();

  return (
    <PageTransition>
      <div className="shell flex flex-1 flex-col py-10">
        <nav aria-label={t("authors.migasDePan")} className="mb-7 text-[13px] text-ink-faint">
          <Link
            href="/autores"
            transitionTypes={["nav-back"]}
            className="font-semibold text-ink underline underline-offset-2"
          >
            {t("authors.autorias")}
          </Link>
          <span className="px-2">/</span>
          <span>{displayName}</span>
        </nav>

        <header className="mb-8 animate-fade-in-up">
          <p className="micro mb-3">{t("authors.autoria")}</p>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h1 className="font-display text-[38px] font-bold sm:text-[46px]">
              {displayName}
            </h1>
            <p className="text-[14px] text-ink-soft tabular-nums">
              {books.length === 1
                ? t("authors.oneInCatalog")
                : t("authors.nInCatalog", { n: books.length })}
            </p>
          </div>
        </header>

        <ul className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {books.map((book, index) => (
            <li key={book.id}>
              <Reveal delay={(index % 4) * 70}>
                <BookCard book={book} />
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </PageTransition>
  );
}
