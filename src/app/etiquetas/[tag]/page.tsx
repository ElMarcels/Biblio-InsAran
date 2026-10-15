import Link from "next/link";
import { notFound } from "next/navigation";

import { BookCard } from "@/components/BookCard";
import { getT } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ tag: string }>;

function decodeTag(value: string): string {
  try {
    return decodeURIComponent(value).trim();
  } catch {
    return value.trim();
  }
}

export async function generateMetadata({ params }: { params: Params }) {
  const { tag } = await params;
  return { title: `${decodeTag(tag)} · Materia` };
}

export default async function TagPage({ params }: { params: Params }) {
  const { tag } = await params;
  const label = decodeTag(tag);
  if (!label) notFound();

  const books = await prisma.book.findMany({
    where: { tags: { has: label } },
    orderBy: [{ title: "asc" }],
  });

  if (books.length === 0) notFound();

  const t = await getT();

  return (
    <div className="shell flex flex-1 flex-col py-10">
      <nav aria-label={t("tags.migasDePan")} className="mb-7 text-[13px] text-ink-faint">
        <Link href="/etiquetas" className="font-semibold text-ink underline underline-offset-2">
          {t("tags.materias")}
        </Link>
        <span className="px-2">/</span>
        <span>{label}</span>
      </nav>

      <header className="mb-8">
        <p className="micro mb-3">{t("tags.materia")}</p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="font-display text-[38px] font-bold sm:text-[46px]">
            {label}
          </h1>
          <p className="text-[14px] text-ink-soft tabular-nums">
            {books.length === 1 ? t("tags.oneTitle") : t("tags.nTitles", { n: books.length })}
          </p>
        </div>
      </header>

      <ul className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
        {books.map((book) => (
          <li key={book.id}>
            <BookCard book={book} />
          </li>
        ))}
      </ul>
    </div>
  );
}
