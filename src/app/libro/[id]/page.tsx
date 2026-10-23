import Link from "next/link";
import { notFound } from "next/navigation";
import { ViewTransition } from "react";

import { BookCard } from "@/components/BookCard";
import { BookCover } from "@/components/BookCover";
import { DeleteBookButton } from "@/components/DeleteBookButton";
import { PageTransition } from "@/components/PageTransition";
import { ReserveBookButton } from "@/components/reader/ReaderActions";
import {
  AddToListButton,
  RemoveFromListButton,
} from "@/components/reader/ReaderListActions";
import { Reveal } from "@/components/Reveal";
import { ReviewSection } from "@/components/ReviewSection";
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
import { getCurrentReader } from "@/lib/reader-auth";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { id } = await params;
  const book = await prisma.book.findUnique({
    where: { id },
    select: { title: true, author: true },
  });
  if (!book) {
    const t = await getT();
    return { title: t("book.libroNoEncontrado") };
  }
  return { title: `${book.title} · ${book.author}` };
}

export default async function BookPage({ params }: { params: Params }) {
  const { id } = await params;
  const t = await getT();

  const [book, user, reader] = await Promise.all([
    prisma.book.findUnique({
      where: { id },
      include: {
        createdBy: { select: { displayName: true } },
        updatedBy: { select: { displayName: true } },
      },
    }),
    getCurrentUser(),
    getCurrentReader(),
  ]);

  if (!book) notFound();

  const related = await prisma.book.findMany({
    where: { category: book.category, NOT: { id: book.id } },
    orderBy: { title: "asc" },
    take: 4,
  });

  const readerReservation =
    reader && !reader.pinMustChange
      ? await prisma.reservation.findFirst({
          where: { bookId: book.id, readerId: reader.id, status: "ACTIVE" },
          select: { id: true },
        })
      : null;

  // Listas de lectura de la persona lectora y cuáles contienen este libro.
  const readerLists =
    reader && !reader.pinMustChange
      ? await prisma.collection.findMany({
          where: { ownerReaderId: reader.id },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            name: true,
            books: { where: { bookId: book.id }, select: { bookId: true } },
          },
        })
      : [];
  const listsWithBook = readerLists.filter((list) => list.books.length > 0);

  const [onLoan, reserved, reviews, myReview] = await Promise.all([
    onLoanCounts([book.id]),
    activeReservationCounts([book.id]),
    prisma.review.findMany({
      where: { bookId: book.id, approved: true },
      include: { reader: { select: { fullName: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    reader && !reader.pinMustChange
      ? prisma.review.findUnique({
          where: { bookId_readerId: { bookId: book.id, readerId: reader.id } },
          include: { reader: { select: { fullName: true } } },
        })
      : Promise.resolve(null),
  ]);
  const loaned = onLoan.get(book.id) ?? 0;
  const available = Math.max(0, book.copies - loaned);
  const reservedCount = reserved.get(book.id) ?? 0;
  const reviewCount = reviews.length;
  const averageRating =
    reviewCount === 0
      ? 0
      : reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount;

  const details: Array<{ label: string; value: string }> = [
    { label: t("book.categoria"), value: book.category },
    { label: t("book.idioma"), value: book.language },
    { label: t("book.editorial"), value: book.publisher ?? "—" },
    { label: t("book.ano"), value: book.year ? String(book.year) : "—" },
    { label: t("book.paginas"), value: book.pages ? String(book.pages) : "—" },
    { label: t("book.iSBN"), value: book.isbn ?? "—" },
    { label: t("book.ubicacion"), value: book.location ?? "—" },
  ];
  if (book.recordNumber) {
    details.push({ label: t("book.nDeRegistro"), value: book.recordNumber });
  }
  if (book.cdu) {
    details.push({ label: t("book.cDU"), value: book.cdu });
  }

  return (
    <PageTransition>
      <div className="shell flex flex-1 flex-col py-10">
        <nav aria-label={t("book.migasDePan")} className="mb-7 text-[13px] text-ink-faint">
          <Link
            href="/catalogo"
            transitionTypes={["nav-back"]}
            className="font-semibold text-ink underline underline-offset-2"
          >
            {t("book.catalogo")}
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
          <div className="max-w-[300px] animate-fade-in-up">
            <ViewTransition name={`cover-${book.id}`} share="morph" default="none">
              <BookCover
                title={book.title}
                author={book.author}
                category={book.category}
                src={book.coverUrl}
                size="lg"
              />
            </ViewTransition>
            <div className="mt-4 border-2 border-line bg-surface p-4">
              <p className="micro">{t("book.disponibilidad")}</p>
              <p className="mt-1 font-display text-[26px] font-bold leading-none">
                {t("book.availableDeTotalEjemplares", {
                  available,
                  total: book.copies,
                })}
              </p>
              <p className="mt-2 text-[13px] text-ink-soft">
                {available > 0
                  ? t(
                      available === 1 ? "book.oneAvailableForLoan" : "book.nAvailableForLoan",
                      { n: available },
                    )
                  : t("book.todosLosEjemplaresEstanPrestados")}
                {reservedCount > 0
                  ? ` · ${t(
                      reservedCount === 1
                        ? "book.onePendingReservation"
                        : "book.nPendingReservations",
                      { n: reservedCount },
                    )}`
                  : ""}
              </p>
              {book.location ? (
                <p className="mt-2 text-[13px] text-ink-soft">
                  {t("book.estanteria")}{" "}
                  <span className="font-mono font-semibold">{book.location}</span>
                </p>
              ) : null}
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex animate-fade-in-up flex-wrap items-center gap-2" style={{ animationDelay: "80ms" }}>
              <Link
                href={`/catalogo?categoria=${encodeURIComponent(book.category)}`}
                className="tag-accent"
              >
                {book.category}
              </Link>
              {book.year ? <span className="tag-muted">{book.year}</span> : null}
            </div>

            <h1 className="mt-4 animate-fade-in-up font-display text-[38px] font-bold sm:text-[50px]" style={{ animationDelay: "120ms" }}>
              {book.title}
            </h1>
            <p className="mt-2 animate-fade-in-up text-[19px] text-ink-soft" style={{ animationDelay: "170ms" }}>
              <Link
                href={authorHref(book.author)}
                className="font-semibold text-ink underline decoration-line decoration-2 underline-offset-4 hover:text-accent"
              >
                {book.author}
              </Link>
              {book.publisher ? ` · ${book.publisher}` : ""}
            </p>

            {book.tags.length > 0 ? (
              <ul className="mt-4 flex animate-fade-in-up flex-wrap items-center gap-2" style={{ animationDelay: "220ms" }}>
                {book.tags.map((tag) => (
                  <li key={tag}>
                    <Link href={tagHref(tag)} className="tag-muted hover:-translate-y-px hover:border-accent hover:text-accent">
                      {tag}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}

            {user ? (
              <div className="mt-5 flex animate-fade-in-up flex-wrap items-center gap-2" style={{ animationDelay: "260ms" }}>
                <Link href={`/panel/libros/${book.id}/editar`} className="btn-outline btn-sm">
                  {t("book.editarFicha")}
                </Link>
                <Link
                  href={`/panel/prestamos/nuevo?libro=${book.id}`}
                  className="btn-outline btn-sm"
                >
                  {t("book.prestar")}
                </Link>
                <DeleteBookButton bookId={book.id} title={book.title} compact />
              </div>
            ) : null}

            <div className="mt-4 flex animate-fade-in-up flex-wrap items-center gap-2" style={{ animationDelay: "280ms" }}>
              {reader ? (
                reader.pinMustChange ? (
                  <Link href="/mi-biblioteca/cambio-pin" className="btn-outline btn-sm">
                    {t("reader.changePinFirst")}
                  </Link>
                ) : readerReservation ? (
                  <span className="tag-muted">{t("reader.alreadyReserved")}</span>
                ) : (
                  <ReserveBookButton bookId={book.id} />
                )
              ) : (
                <Link href="/mi-biblioteca" className="btn-outline btn-sm">
                  {t("reader.reserveFromLibrary")}
                </Link>
              )}
            </div>

            <div
              className="mt-3 flex animate-fade-in-up flex-wrap items-center gap-2"
              style={{ animationDelay: "300ms" }}
            >
              {reader && !reader.pinMustChange ? (
                <>
                  <AddToListButton
                    bookId={book.id}
                    lists={readerLists.map((list) => ({
                      id: list.id,
                      name: list.name,
                    }))}
                  />
                  {listsWithBook.map((list) => (
                    <span
                      key={list.id}
                      className="flex items-center gap-1 border-2 border-line bg-surface px-2 py-1 text-[12.5px] font-semibold"
                    >
                      {t("reader.inYourList", { list: list.name })}
                      <RemoveFromListButton
                        listId={list.id}
                        bookId={book.id}
                        compact
                      />
                    </span>
                  ))}
                </>
              ) : (
                <Link href="/mi-biblioteca" className="btn-outline btn-sm">
                  {t("reader.addToListLogin")}
                </Link>
              )}
            </div>

            {book.description ? (
              <section className="mt-8 animate-fade-in-up" style={{ animationDelay: "300ms" }}>
                <h2 className="micro mb-3">{t("book.resena")}</h2>
                <p className="max-w-2xl whitespace-pre-line text-[16px] leading-relaxed text-ink-soft">
                  {book.description}
                </p>
              </section>
            ) : null}

            <div className="mt-9 animate-fade-in-up" style={{ animationDelay: "320ms" }}>
              <ReviewSection
                bookId={book.id}
                reviews={reviews}
                average={averageRating}
                count={reviewCount}
                canReview={Boolean(reader && !reader.pinMustChange)}
                myReview={myReview}
              />
            </div>

            <section className="mt-9">
              <h2 className="micro mb-3">{t("book.ficha")}</h2>
              <dl className="grid max-w-2xl grid-cols-1 border-2 border-line bg-surface sm:grid-cols-2">
                {details.map((detail, index) => (
                  <div
                    key={detail.label}
                    className="anim-row flex items-baseline justify-between gap-4 border-b border-hairline px-4 py-2.5 last:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0"
                    style={{ animationDelay: `${340 + index * 45}ms` }}
                  >
                    <dt className="text-[13px] font-medium text-ink-faint">{detail.label}</dt>
                    <dd className="text-right text-[14px] font-semibold">{detail.value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className="mt-8 animate-fade-in-up text-[13px] text-ink-faint" style={{ animationDelay: "420ms" }}>
              <p>
                {t("book.incorporadoElDateBy", {
                  date: formatDate(book.createdAt),
                  by: book.createdBy
                    ? t("book.porName", { name: book.createdBy.displayName })
                    : "",
                })}
              </p>
              {book.updatedBy && book.updatedAt.getTime() !== book.createdAt.getTime() ? (
                <p className="mt-1">
                  {t("book.ultimaEdicionElDatePorName", {
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
            <Reveal className="mb-6 flex items-end justify-between gap-3">
              <h2 className="font-display text-[26px] font-bold">
                {t("book.masDeCategory", { category: book.category })}
              </h2>
              <Link
                href={`/catalogo?categoria=${encodeURIComponent(book.category)}`}
                className="btn-ghost btn-sm"
              >
                {t("book.verTodo")}
              </Link>
            </Reveal>
            <ul className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
              {related.map((item, index) => (
                <li key={item.id}>
                  <Reveal delay={index * 70}>
                    <BookCard book={item} />
                  </Reveal>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </PageTransition>
  );
}
