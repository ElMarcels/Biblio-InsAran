import Link from "next/link";
import { notFound } from "next/navigation";

import { DeleteBookButton } from "@/components/DeleteBookButton";
import { BookForm } from "@/components/forms/BookForm";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";
import { PageTransition } from "@/components/PageTransition";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("panel.books.editarLibro") };
}

export default async function EditBookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const t = await getT();

  const book = await prisma.book.findUnique({ where: { id } });
  if (!book) notFound();

  return (
    <PageTransition>
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <nav aria-label={t("panel.books.migasDePan")} className="text-[13px] text-ink-faint">
        <Link href="/panel/libros" className="font-semibold text-ink underline underline-offset-2">
          {t("panel.books.libros")}
        </Link>
        <span className="px-2">/</span>
        <Link href={`/libro/${book.id}`} className="hover:text-ink">
          {book.title}
        </Link>
        <span className="px-2">/</span>
        <span>{t("panel.books.editar")}</span>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-[28px] font-bold">{t("panel.books.editarLaFicha")}</h2>
          <p className="mt-1.5 text-[14px] text-ink-soft">
            {t("panel.books.modificaLosDatosYGuardaLosCambios")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/libro/${book.id}`} className="btn-ghost btn-sm">
            {t("panel.books.verEnElCatalogo")}
          </Link>
          <DeleteBookButton bookId={book.id} title={book.title} compact />
        </div>
      </header>

      <div className="border-2 border-line bg-surface p-6 sm:p-8">
        <BookForm
          mode="edit"
          values={{
            id: book.id,
            title: book.title,
            author: book.author,
            category: book.category,
            isbn: book.isbn ?? "",
            publisher: book.publisher ?? "",
            year: book.year ? String(book.year) : "",
            language: book.language,
            pages: book.pages ? String(book.pages) : "",
            copies: String(book.copies),
            location: book.location ?? "",
            recordNumber: book.recordNumber ?? "",
            cdu: book.cdu ?? "",
            coverUrl: book.coverUrl ?? "",
            description: book.description ?? "",
            tags: book.tags.join(", "),
          }}
        />
      </div>
    </div>
    </PageTransition>
  );
}
