import Link from "next/link";

import { BookCover } from "@/components/BookCover";
import { PageTransition } from "@/components/PageTransition";
import { Reveal } from "@/components/Reveal";
import { getT } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("collections.colecciones") };
}

export default async function CollectionsPage() {
  const t = await getT();

  const collections = await prisma.collection.findMany({
    where: { ownerReaderId: null },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    include: {
      _count: { select: { books: true } },
      books: {
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        take: 4,
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

  return (
    <PageTransition>
      <div className="shell flex flex-1 flex-col py-10">
        <header className="mb-8 animate-fade-in-up">
          <p className="micro mb-3">{t("collections.colecciones")}</p>
        <h1 className="font-display text-[38px] font-bold sm:text-[44px]">
          {t("collections.listasPreparadasPorLaBiblioteca")}
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] text-ink-soft">
          {t(
            "collections.seleccionesQueCambianConElCursoNovedadesRecomendadosElClubDeLect",
          )}
        </p>
      </header>

      {collections.length === 0 ? (
        <p className="border-2 border-dashed border-hairline bg-surface px-6 py-14 text-center text-[15px] text-ink-soft">
          {t("collections.todaviaNoHayListasPublicadas")}
        </p>
      ) : (
        <ul className="flex flex-col gap-5">
          {collections.map((collection, index) => (
            <Reveal key={collection.id} delay={index * 80}>
              <li
                className="border-2 border-line bg-surface p-5 transition-[transform,box-shadow] duration-150 hover:-translate-y-[2px] hover:shadow-[6px_6px_0_0_var(--color-line)] sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-2xl">
                    <h2 className="font-display text-[24px] font-bold">
                      <Link
                        href={`/colecciones/${collection.slug}`}
                        className="transition-colors duration-150 hover:text-accent"
                      >
                        {collection.name}
                      </Link>
                    </h2>
                    {collection.description ? (
                      <p className="mt-1.5 text-[14px] text-ink-soft">{collection.description}</p>
                    ) : null}
                    <p className="mt-2 text-[13px] tabular-nums text-ink-faint">
                      {collection._count.books === 1
                        ? t("collections.oneBook")
                        : t("collections.nBooks", { n: collection._count.books })}
                    </p>
                  </div>
                  <Link href={`/colecciones/${collection.slug}`} className="btn-outline btn-sm">
                    {t("collections.verLaLista")}
                  </Link>
                </div>

                {collection.books.length > 0 ? (
                  <ul className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {collection.books.map((item, bookIndex) => (
                      <li key={item.bookId} className="animate-fade-in-up" style={{ animationDelay: `${150 + bookIndex * 70}ms` }}>
                        <Link href={`/libro/${item.book.id}`} className="group block">
                          <BookCover
                            title={item.book.title}
                            author={item.book.author}
                            category={item.book.category}
                            src={item.book.coverUrl}
                            size="sm"
                          />
                          <p className="mt-2 text-[13px] font-semibold leading-snug transition-colors duration-150 group-hover:text-accent">
                            {item.book.title}
                          </p>
                          <p className="text-[12px] text-ink-faint">{item.book.author}</p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            </Reveal>
          ))}
        </ul>
      )}
      </div>
    </PageTransition>
  );
}
