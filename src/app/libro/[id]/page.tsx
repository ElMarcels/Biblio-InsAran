import Link from "next/link";
import { notFound } from "next/navigation";

import { BookCard } from "@/components/BookCard";
import { BookCover } from "@/components/BookCover";
import { DeleteBookButton } from "@/components/DeleteBookButton";
import { getCurrentUser } from "@/lib/auth";
import { formatDate, pluralize } from "@/lib/format";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { id } = await params;
  const book = await prisma.book.findUnique({
    where: { id },
    select: { title: true, author: true },
  });
  if (!book) return { title: "Libro no encontrado" };
  return { title: `${book.title} · ${book.author}` };
}

export default async function BookPage({ params }: { params: Params }) {
  const { id } = await params;

  const [book, user] = await Promise.all([
    prisma.book.findUnique({
      where: { id },
      include: {
        createdBy: { select: { displayName: true } },
        updatedBy: { select: { displayName: true } },
      },
    }),
    getCurrentUser(),
  ]);

  if (!book) notFound();

  const related = await prisma.book.findMany({
    where: { category: book.category, NOT: { id: book.id } },
    orderBy: { title: "asc" },
    take: 4,
  });

  const details: Array<{ label: string; value: string }> = [
    { label: "Categoría", value: book.category },
    { label: "Idioma", value: book.language },
    { label: "Editorial", value: book.publisher ?? "—" },
    { label: "Año", value: book.year ? String(book.year) : "—" },
    { label: "Páginas", value: book.pages ? String(book.pages) : "—" },
    { label: "ISBN", value: book.isbn ?? "—" },
    { label: "Ubicación", value: book.location ?? "—" },
  ];

  return (
    <div className="shell flex flex-1 flex-col py-10">
      <nav aria-label="Migas de pan" className="mb-7 text-[13px] text-ink-faint">
        <Link href="/catalogo" className="font-semibold text-ink underline underline-offset-2">
          Catálogo
        </Link>
        <span className="px-2">/</span>
        <Link
          href={`/catalogo?categoria=${encodeURIComponent(book.category)}`}
          className="underline underline-offset-2 hover:text-ink"
        >
          {book.category}
        </Link>
      </nav>

      <article className="grid gap-9 lg:grid-cols-[300px_1fr]">
        <div className="max-w-[300px]">
          <BookCover
            title={book.title}
            author={book.author}
            category={book.category}
            size="lg"
          />
          <div className="mt-4 border-2 border-line bg-surface p-4">
            <p className="micro">Disponibilidad</p>
            <p className="mt-1 font-display text-[26px] font-bold leading-none">
              {pluralize(book.copies, "ejemplar", "ejemplares")}
            </p>
            {book.location ? (
              <p className="mt-2 text-[13px] text-ink-soft">
                Estantería <span className="font-mono font-semibold">{book.location}</span>
              </p>
            ) : null}
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/catalogo?categoria=${encodeURIComponent(book.category)}`}
              className="tag-accent"
            >
              {book.category}
            </Link>
            {book.year ? <span className="tag-muted">{book.year}</span> : null}
          </div>

          <h1 className="mt-4 font-display text-[38px] font-bold sm:text-[50px]">
            {book.title}
          </h1>
          <p className="mt-2 text-[19px] text-ink-soft">
            {book.author}
            {book.publisher ? ` · ${book.publisher}` : ""}
          </p>

          {user ? (
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Link href={`/panel/libros/${book.id}/editar`} className="btn-outline btn-sm">
                Editar ficha
              </Link>
              {user.role === "OWNER" ? (
                <DeleteBookButton bookId={book.id} title={book.title} compact />
              ) : null}
            </div>
          ) : null}

          {book.description ? (
            <section className="mt-8">
              <h2 className="micro mb-3">Reseña</h2>
              <p className="max-w-2xl whitespace-pre-line text-[16px] leading-relaxed text-ink-soft">
                {book.description}
              </p>
            </section>
          ) : null}

          <section className="mt-9">
            <h2 className="micro mb-3">Ficha</h2>
            <dl className="grid max-w-2xl grid-cols-1 border-2 border-line bg-surface sm:grid-cols-2">
              {details.map((detail) => (
                <div
                  key={detail.label}
                  className="flex items-baseline justify-between gap-4 border-b border-hairline px-4 py-2.5 last:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0"
                >
                  <dt className="text-[13px] font-medium text-ink-faint">{detail.label}</dt>
                  <dd className="text-right text-[14px] font-semibold">{detail.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="mt-8 text-[13px] text-ink-faint">
            <p>
              Incorporado el {formatDate(book.createdAt)}
              {book.createdBy ? ` por ${book.createdBy.displayName}` : ""}.
            </p>
            {book.updatedBy && book.updatedAt.getTime() !== book.createdAt.getTime() ? (
              <p className="mt-1">
                Última edición el {formatDate(book.updatedAt)} por {book.updatedBy.displayName}.
              </p>
            ) : null}
          </section>
        </div>
      </article>

      {related.length > 0 ? (
        <section className="mt-14 border-t-2 border-line pt-10">
          <div className="mb-6 flex items-end justify-between gap-3">
            <h2 className="font-display text-[26px] font-bold">
              Más de {book.category}
            </h2>
            <Link
              href={`/catalogo?categoria=${encodeURIComponent(book.category)}`}
              className="btn-ghost btn-sm"
            >
              Ver todo
            </Link>
          </div>
          <ul className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((item) => (
              <li key={item.id}>
                <BookCard book={item} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
