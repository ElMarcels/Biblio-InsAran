import Link from "next/link";

import { BookForm } from "@/components/forms/BookForm";
import { EMPTY_BOOK } from "@/components/forms/book-form-values";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Añadir libro" };

export default async function NewBookPage() {
  await requireUser();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <nav aria-label="Migas de pan" className="text-[13px] text-ink-faint">
        <Link href="/panel/libros" className="font-semibold text-ink underline underline-offset-2">
          Libros
        </Link>
        <span className="px-2">/</span>
        <span>Añadir libro</span>
      </nav>

      <header>
        <h2 className="font-display text-[28px] font-bold">Añadir un libro</h2>
        <p className="mt-1.5 text-[14px] text-ink-soft">
          Los campos marcados con <span className="text-accent">*</span> son
          obligatorios. El libro aparecerá en el catálogo en cuanto lo guardes.
        </p>
      </header>

      <div className="border-2 border-line bg-surface p-6 sm:p-8">
        <BookForm mode="create" values={EMPTY_BOOK} />
      </div>
    </div>
  );
}
