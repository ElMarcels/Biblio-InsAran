import Link from "next/link";

import { EmptyState } from "@/components/EmptyState";
import { Notice } from "@/components/Notice";
import { CollectionForm } from "@/components/forms/CollectionForm";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Listas curadas") };
}

const FLASH: Record<string, string> = {
  borrada: "La lista se ha borrado.",
};

export default async function CollectionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser();
  const t = await getT();
  const params = await searchParams;
  const aviso = Array.isArray(params.aviso) ? params.aviso[0] : params.aviso;

  const collections = await prisma.collection.findMany({
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    include: { _count: { select: { books: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-[26px] font-bold">{t("Listas curadas")}</h2>
        <p className="mt-1 text-[14px] text-ink-soft">
          {t(
            "Agrupa los libros a mano para destacarlos: novedades, recomendados, club de lectura…",
          )}
        </p>
      </div>

      {aviso && FLASH[aviso] ? <Notice tone="success">{t(FLASH[aviso])}</Notice> : null}

      {collections.length === 0 ? (
        <EmptyState
          title={t("Todavía no hay listas")}
          description={t("Crea la primera lista con el formulario de abajo.")}
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((collection) => (
            <li key={collection.id} className="border-2 border-line bg-surface">
              <div className="flex flex-col gap-1 border-b-2 border-line p-4">
                <h3 className="font-display text-[18px] font-bold">
                  <Link href={`/panel/colecciones/${collection.id}`} className="hover:text-accent">
                    {collection.name}
                  </Link>
                </h3>
                <p className="text-[12px] tabular-nums text-ink-faint">
                  {collection._count.books === 1
                    ? t("1 libro")
                    : t("{n} libros", { n: collection._count.books })}
                </p>
                {collection.description ? (
                  <p className="mt-1 text-[13px] text-ink-soft">{collection.description}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2 p-4">
                <Link href={`/panel/colecciones/${collection.id}`} className="btn-outline btn-sm">
                  {t("Gestionar")}
                </Link>
                <Link
                  href={`/colecciones/${collection.slug}`}
                  className="btn-ghost btn-sm"
                  target="_blank"
                  rel="noreferrer"
                >
                  {t("Ver en el catálogo")}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}

      <section className="border-2 border-line bg-surface p-6 sm:p-8">
        <h3 className="font-display text-[20px] font-bold">{t("Nueva lista")}</h3>
        <p className="mt-1 mb-5 text-[14px] text-ink-soft">
          {t("Le daremos automáticamente un enlace con el nombre de la lista.")}
        </p>
        <CollectionForm mode="create" values={{ name: "", description: "" }} />
      </section>
    </div>
  );
}
