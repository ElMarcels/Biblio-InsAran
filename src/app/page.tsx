import Link from "next/link";

import { BookCard } from "@/components/BookCard";
import { EmptyState } from "@/components/EmptyState";
import { SITE_INSTITUTION } from "@/lib/constants";
import { getT } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";

export default async function HomePage() {
  const [totalBooks, copies, categoryGroups, latest, collections, t] =
    await Promise.all([
      prisma.book.count(),
      prisma.book.aggregate({ _sum: { copies: true } }),
      prisma.book.groupBy({ by: ["category"], _count: { _all: true } }),
      prisma.book.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
      prisma.collection.findMany({
        where: { books: { some: {} } },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        take: 3,
        include: { _count: { select: { books: true } } },
      }),
      getT(),
    ]);

  const totalCopies = copies._sum.copies ?? 0;
  const categories = [...categoryGroups].sort(
    (a, b) => b._count._all - a._count._all,
  );

  return (
    <div className="flex flex-1 flex-col">
      <section className="border-b-2 border-line bg-surface">
        <div className="shell grid gap-10 py-14 lg:grid-cols-[1.5fr_1fr] lg:py-20">
          <div>
            <p className="micro mb-5">
              {t("home.fondoBibliograficoInstitution", {
                institution: SITE_INSTITUTION,
              })}
            </p>
            <h1 className="max-w-[16ch] text-[46px] font-bold sm:text-[68px]">
              Biblioteca{" "}
              <span className="text-accent">Institut d&apos;Aran</span>
            </h1>
            <p className="mt-6 max-w-xl text-[16px] leading-relaxed text-ink-soft">
              {t(
                "home.consultaElCatalogoCompletoDelCentroFiltraPorCategoriaOAutoriaYCo",
              )}
            </p>

            <form action="/catalogo" method="get" className="mt-8 flex max-w-xl">
              <label htmlFor="q" className="sr-only">
                {t("home.buscarEnElCatalogo")}
              </label>
              <input
                id="q"
                name="q"
                className="input border-r-0"
                placeholder={t("home.tituloAutoriaOISBN")}
                autoComplete="off"
              />
              <button type="submit" className="btn-primary shrink-0">
                {t("home.buscar")}
              </button>
            </form>

            <p className="mt-4 text-[13px] text-ink-faint">
              {t("home.gestionasElFondo")}{" "}
              <Link href="/login" className="font-semibold text-accent underline underline-offset-2">
                {t("home.accedeConTuCuenta")}
              </Link>{" "}
              {t("home.paraAnadirLibros")}
            </p>
          </div>

          <dl className="grid grid-cols-2 self-start border-2 border-line bg-paper sm:grid-cols-2 lg:mt-2">
            <div className="border-b-2 border-r-2 border-line p-5">
              <dt className="micro">{t("home.titulos")}</dt>
              <dd className="mt-1 font-display text-[40px] font-bold leading-none tabular-nums">
                {totalBooks}
              </dd>
            </div>
            <div className="border-b-2 border-line p-5">
              <dt className="micro">{t("home.ejemplares")}</dt>
              <dd className="mt-1 font-display text-[40px] font-bold leading-none tabular-nums">
                {totalCopies}
              </dd>
            </div>
            <div className="border-r-2 border-line p-5">
              <dt className="micro">{t("home.categorias")}</dt>
              <dd className="mt-1 font-display text-[40px] font-bold leading-none tabular-nums">
                {categories.length}
              </dd>
            </div>
            <div className="p-5">
              <dt className="micro">{t("home.acceso")}</dt>
              <dd className="mt-2 text-[14px] font-semibold leading-snug">
                {t("home.publico")}
                <br />
                <span className="text-ink-faint">{t("home.paraConsultar")}</span>
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="shell py-14">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="micro mb-2">{t("home.recienIncorporados")}</p>
            <h2 className="font-display text-[30px] font-bold">
              {t("home.novedadesDelFondo")}
            </h2>
          </div>
          <Link href="/catalogo" className="btn-outline btn-sm">
            {t("home.verCatalogoCompleto")}
          </Link>
        </div>

        {latest.length === 0 ? (
          <EmptyState
            title={t("home.elCatalogoTodaviaEstaVacio")}
            description={t(
              "home.cuandoSeAnadaElPrimerLibroApareceraAquiElPersonalPuedeIncorporar",
            )}
            action={
              <Link href="/login" className="btn-primary">
                {t("home.accederAlPanel")}
              </Link>
            }
          />
        ) : (
          <ul className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
            {latest.map((book) => (
              <li key={book.id}>
                <BookCard book={book} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {collections.length > 0 ? (
        <section className="border-t-2 border-line bg-surface">
          <div className="shell py-14">
            <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="micro mb-2">{t("home.colecciones")}</p>
                <h2 className="font-display text-[30px] font-bold">
                  {t("home.listasPreparadasPorLaBiblioteca")}
                </h2>
              </div>
              <Link href="/colecciones" className="btn-outline btn-sm">
                {t("home.verTodasLasListas")}
              </Link>
            </div>

            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {collections.map((collection) => (
                <li key={collection.id}>
                  <Link
                    href={`/colecciones/${collection.slug}`}
                    className="flex h-full flex-col border-2 border-line bg-paper p-5 transition-colors hover:bg-ink hover:text-paper"
                  >
                    <h3 className="font-display text-[20px] font-bold">
                      {collection.name}
                    </h3>
                    {collection.description ? (
                      <p className="mt-1.5 text-[13px] leading-relaxed opacity-80">
                        {collection.description}
                      </p>
                    ) : null}
                    <p className="mt-3.5 font-mono text-[12px] tabular-nums opacity-70">
                      {collection._count.books === 1
                        ? t("home.oneBook")
                        : t("home.nBooks", { n: collection._count.books })}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {categories.length > 0 ? (
        <section className="border-t-2 border-line bg-surface">
          <div className="shell py-14">
            <p className="micro mb-2">{t("home.exploraElFondo")}</p>
            <h2 className="font-display text-[30px] font-bold">
              {t("home.porCategoria")}
            </h2>

            <ul className="mt-7 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((group) => (
                <li key={group.category}>
                  <Link
                    href={`/catalogo?categoria=${encodeURIComponent(group.category)}`}
                    className="flex items-center justify-between border-2 border-line bg-paper px-4 py-3 transition-colors hover:bg-ink hover:text-paper"
                  >
                    <span className="text-[15px] font-semibold">{group.category}</span>
                    <span className="font-mono text-[13px] tabular-nums opacity-70">
                      {group._count._all}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </div>
  );
}
