import Link from "next/link";

import { EmptyState } from "@/components/EmptyState";
import { LoanForm } from "@/components/forms/LoanForm";
import { PageTransition } from "@/components/PageTransition";
import { requireUser } from "@/lib/auth";
import { DEFAULT_LOAN_DAYS } from "@/lib/constants";
import { getT } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";
import { addDaysInput, todayInput } from "@/lib/validation";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("panel.loans.registrarPrestamo") };
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
    <PageTransition>
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <nav aria-label={t("panel.loans.migasDePan")} className="text-[13px] text-ink-faint">
        <Link href="/panel/prestamos" className="font-semibold text-ink underline underline-offset-2">
          {t("panel.loans.prestamos")}
        </Link>
        <span className="px-2">/</span>
        <span>{t("panel.loans.registrarPrestamo")}</span>
      </nav>

      <header>
        <h2 className="font-display text-[28px] font-bold">{t("panel.loans.registrarUnPrestamo")}</h2>
        <p className="mt-1.5 text-[14px] text-ink-soft">
          {t(
            "panel.loans.eligeElLibroLaPersonaQueSeLoLlevaYHastaCuandoPuedeTenerloLosEjem",
          )}
        </p>
      </header>

      {books.length === 0 || readers.length === 0 ? (
        <EmptyState
          title={books.length === 0 ? t("panel.loans.noHayLibros") : t("panel.loans.noHayLectores")}
          description={
            books.length === 0
              ? t("panel.loans.antesDeRegistrarUnPrestamoNecesitasTenerAlgunLibroEnElCatalogo")
              : t(
                  "panel.loans.antesDeRegistrarUnPrestamoNecesitasDarDeAltaAlMenosUnLectorOLect",
                )
          }
          action={
            books.length === 0 ? (
              <Link href="/panel/libros/nuevo" className="btn-primary">
                {t("panel.loans.anadirLibro")}
              </Link>
            ) : (
              <Link href="/panel/lectores" className="btn-primary">
                {t("panel.loans.anadirLector")}
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
    </PageTransition>
  );
}
