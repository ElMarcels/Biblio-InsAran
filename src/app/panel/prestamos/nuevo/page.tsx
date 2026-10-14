import Link from "next/link";

import { EmptyState } from "@/components/EmptyState";
import { LoanForm } from "@/components/forms/LoanForm";
import { requireUser } from "@/lib/auth";
import { DEFAULT_LOAN_DAYS } from "@/lib/constants";
import { getT } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";
import { addDaysInput, todayInput } from "@/lib/validation";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Registrar préstamo") };
}

function one(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function NewLoanPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser();
  const t = await getT();
  const params = await searchParams;

  const [books, readers] = await Promise.all([
    prisma.book.findMany({
      orderBy: [{ title: "asc" }],
      select: { id: true, title: true, author: true },
    }),
    prisma.reader.findMany({
      where: { active: true },
      orderBy: [{ fullName: "asc" }],
      select: { id: true, fullName: true, groupName: true },
    }),
  ]);

  const defaultDueAt = addDaysInput(todayInput(), DEFAULT_LOAN_DAYS);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <nav aria-label={t("Migas de pan")} className="text-[13px] text-ink-faint">
        <Link href="/panel/prestamos" className="font-semibold text-ink underline underline-offset-2">
          {t("Préstamos")}
        </Link>
        <span className="px-2">/</span>
        <span>{t("Registrar préstamo")}</span>
      </nav>

      <header>
        <h2 className="font-display text-[28px] font-bold">{t("Registrar un préstamo")}</h2>
        <p className="mt-1.5 text-[14px] text-ink-soft">
          {t(
            "Elige el libro, la persona que se lo lleva y hasta cuándo puede tenerlo. Los ejemplares disponibles se ajustan solos.",
          )}
        </p>
      </header>

      {books.length === 0 || readers.length === 0 ? (
        <EmptyState
          title={books.length === 0 ? t("No hay libros") : t("No hay lectores")}
          description={
            books.length === 0
              ? t("Antes de registrar un préstamo necesitas tener algún libro en el catálogo.")
              : t(
                  "Antes de registrar un préstamo necesitas dar de alta al menos un lector o lectora.",
                )
          }
          action={
            books.length === 0 ? (
              <Link href="/panel/libros/nuevo" className="btn-primary">
                {t("Añadir libro")}
              </Link>
            ) : (
              <Link href="/panel/lectores" className="btn-primary">
                {t("Añadir lector")}
              </Link>
            )
          }
        />
      ) : (
        <div className="border-2 border-line bg-surface p-6 sm:p-8">
          <LoanForm
            books={books}
            readers={readers}
            defaultDueAt={defaultDueAt}
            defaultBookId={one(params.libro)}
            defaultReaderId={one(params.lector)}
          />
        </div>
      )}
    </div>
  );
}
