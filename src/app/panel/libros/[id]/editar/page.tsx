import Link from "next/link";
import { notFound } from "next/navigation";

import { DeleteBookButton } from "@/components/DeleteBookButton";
import { BookForm } from "@/components/forms/BookForm";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Editar libro" };

export default async function EditBookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const book = await prisma.book.findUnique({ where: { id } });
  if (!book) notFound();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <nav aria-label="Migas de pan" className="text-[13px] text-ink-faint">
        <Link href="/panel/libros" className="font-semibold text-ink underline underline-offset-2">
          Libros
        </Link>
        <span className="px-2">/</span>
        <Link href={`/libro/${book.id}`} className="hover:text-ink">
          {book.title}
        </Link>
        <span className="px-2">/</span>
        <span>Editar</span>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-[28px] font-bold">Editar la ficha</h2>
          <p className="mt-1.5 text-[14px] text-ink-soft">
            Modifica los datos y guarda los cambios.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/libro/${book.id}`} className="btn-ghost btn-sm">
            Ver en el catálogo
          </Link>
          {user.role === "OWNER" ? (
            <DeleteBookButton bookId={book.id} title={book.title} compact />
          ) : null}
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
            description: book.description ?? "",
          }}
        />
      </div>
    </div>
  );
}
