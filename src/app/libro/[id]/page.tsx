import Link from "next/link";
import { notFound } from "next/navigation";

import { BookCard } from "@/components/BookCard";
import { BookCover } from "@/components/BookCover";
import { DeleteBookButton } from "@/components/DeleteBookButton";
import { getCurrentUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import {
  activeReservationCounts,
  authorHref,
  onLoanCounts,
  tagHref,
} from "@/lib/library";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { id } = await params;
  const book = await prisma.book.findUnique({
    where: { id },
    select: { title: true, author: true },
  });
  if (!book) {
    const t = await getT();
    return { title: t("Libro no encontrado") };
  }
  return { title: `${book.title} · ${book.author}` };
}

export default async function BookPage({ params }: { params: Params }) {
  const { id } = await params;
  const t = await getT();

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

  const [onLoan, reserved] = await Promise.all([
    onLoanCounts([book.id]),
    activeReservationCounts([book.id]),
  ]);
  const loaned = onLoan.get(book.id) ?? 0;
  const available = Math.max(0, book.copies - loaned);
  const reservedCount = reserved.get(book.id) ?? 0;

  const details: Array<{ label: string; value: string }> = [
    { label: t("Categoría"), value: book.category },
    { label: t("Idioma"), value: book.language },
    { label: t("Editorial"), value: book.publisher ?? "—" },
    { label: t("Año"), value: book.year ? String(book.year) : "—" },
    { label: t("Páginas"), value: book.pages ? String(book.pages) : "—" },
    { label: t("ISBN"), value: book.isbn ?? "—" },
    { label: t("Ubicación"), value: book.location ?? "—" },
  ];
  if (book.recordNumber) {
    details.push({ label: t("N.º de registro"), value: book.recordNumber });
  }
  if (book.cdu) {
    details.push({ label: t("CDU"), value: book.cdu });
  }

  return (
    <div className="shell flex flex-1 flex-col py-10">
      <nav aria-label="Migas de pan" className="mb-7 text-[13px] text-ink-faint">
        <Link href="/catalogo" className="font-semibold text-ink underline underline-offset-2">
          {t("Catálogo")}
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
            src={book.coverUrl}
            size="lg"
          />
          <div className="mt-4 border-2 border-line bg-surface p-4">
            <p className="micro">{t("Disponibilidad")}</p>
            <p className="mt-1 font-display text-[26px] font-bold leading-none">
              {t("{available} de {total} ejemplares", {
                available,
                total: book.copies,
              })}
            </p>
            <p className="mt-2 text-[13px] text-ink-soft">
              {available > 0
                ? t(
                    available === 1
                      ? "1 disponible para préstamo"
                      : "{n} disponibles para préstamo",
                    { n: available },
                  )
                : t("Todos los ejemplares están prestados")}
              {reservedCount > 0
                ? ` · ${t(
                    reservedCount === 1
                      ? "1 reserva pendiente"
                      : "{n} reservas pendientes",
                    { n: reservedCount },
                  )}`
                : ""}
            </p>
            {book.location ? (
              <p className="mt-2 text-[13px] text-ink-soft">
                {t("Estantería")}{" "}
                <span className="font-mono font-semibold">{book.location}</span>
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
            <Link
              href={authorHref(book.author)}
              className="font-semibold text-ink underline decoration-line decoration-2 underline-offset-4 hover:text-accent"
            >
              {book.author}
            </Link>
            {book.publisher ? ` · ${book.publisher}` : ""}
          </p>

          {book.tags.length > 0 ? (
            <ul className="mt-4 flex flex-wrap items-center gap-2">
              {book.tags.map((tag) => (
                <li key={tag}>
                  <Link href={tagHref(tag)} className="tag-muted hover:border-accent hover:text-accent">
                    {tag}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}

          {user ? (
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Link href={`/panel/libros/${book.id}/editar`} className="btn-outline btn-sm">
                {t("Editar ficha")}
              </Link>
              <Link
                href={`/panel/prestamos/nuevo?libro=${book.id}`}
                className="btn-outline btn-sm"
              >
                {t("Prestar")}
              </Link>
              <DeleteBookButton bookId={book.id} title={book.title} compact />
            </div>
          ) : null}

          {book.description ? (
            <section className="mt-8">
              <h2 className="micro mb-3">{t("Reseña")}</h2>
              <p className="max-w-2xl whitespace-pre-line text-[16px] leading-relaxed text-ink-soft">
                {book.description}
              </p>
            </section>
          ) : null}

          <section className="mt-9">
            <h2 className="micro mb-3">{t("Ficha")}</h2>
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
              {t("Incorporado el {date}{by}.", {
                date: formatDate(book.createdAt),
                by: book.createdBy
                  ? t(" por {name}", { name: book.createdBy.displayName })
                  : "",
              })}
            </p>
            {book.updatedBy && book.updatedAt.getTime() !== book.createdAt.getTime() ? (
              <p className="mt-1">
                {t("Última edición el {date} por {name}.", {
                  date: formatDate(book.updatedAt),
                  name: book.updatedBy.displayName,
                })}
              </p>
            ) : null}
          </section>
        </div>
      </article>

      {related.length > 0 ? (
        <section className="mt-14 border-t-2 border-line pt-10">
          <div className="mb-6 flex items-end justify-between gap-3">
            <h2 className="font-display text-[26px] font-bold">
              {t("Más de {category}", { category: book.category })}
            </h2>
            <Link
              href={`/catalogo?categoria=${encodeURIComponent(book.category)}`}
              className="btn-ghost btn-sm"
            >
              {t("Ver todo")}
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
