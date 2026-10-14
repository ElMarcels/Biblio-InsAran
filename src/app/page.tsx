import Link from "next/link";

import { BookCard } from "@/components/BookCard";
import { EmptyState } from "@/components/EmptyState";
import { prisma } from "@/lib/prisma";

export default async function HomePage() {
  const [totalBooks, copies, categoryGroups, latest] = await Promise.all([
    prisma.book.count(),
    prisma.book.aggregate({ _sum: { copies: true } }),
    prisma.book.groupBy({ by: ["category"], _count: { _all: true } }),
    prisma.book.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
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
            <p className="micro mb-5">Fondo bibliográfico · Instituto</p>
            <h1 className="max-w-[16ch] text-[46px] font-bold sm:text-[68px]">
              La biblioteca, <span className="text-accent">ordenada.</span>
            </h1>
            <p className="mt-6 max-w-xl text-[16px] leading-relaxed text-ink-soft">
              Consulta el catálogo completo del centro, filtra por categoría o
              autoría y comprueba la disponibilidad de cada ejemplar. El
              personal con cuenta puede incorporar nuevos títulos al fondo.
            </p>

            <form action="/catalogo" method="get" className="mt-8 flex max-w-xl">
              <label htmlFor="q" className="sr-only">
                Buscar en el catálogo
              </label>
              <input
                id="q"
                name="q"
                className="input border-r-0"
                placeholder="Título, autoría o ISBN…"
                autoComplete="off"
              />
              <button type="submit" className="btn-primary shrink-0">
                Buscar
              </button>
            </form>

            <p className="mt-4 text-[13px] text-ink-faint">
              ¿Gestionas el fondo?{" "}
              <Link href="/login" className="font-semibold text-accent underline underline-offset-2">
                Accede con tu cuenta
              </Link>{" "}
              para añadir libros.
            </p>
          </div>

          <dl className="grid grid-cols-2 self-start border-2 border-line bg-paper sm:grid-cols-2 lg:mt-2">
            <div className="border-b-2 border-r-2 border-line p-5">
              <dt className="micro">Títulos</dt>
              <dd className="mt-1 font-display text-[40px] font-bold leading-none tabular-nums">
                {totalBooks}
              </dd>
            </div>
            <div className="border-b-2 border-line p-5">
              <dt className="micro">Ejemplares</dt>
              <dd className="mt-1 font-display text-[40px] font-bold leading-none tabular-nums">
                {totalCopies}
              </dd>
            </div>
            <div className="border-r-2 border-line p-5">
              <dt className="micro">Categorías</dt>
              <dd className="mt-1 font-display text-[40px] font-bold leading-none tabular-nums">
                {categories.length}
              </dd>
            </div>
            <div className="p-5">
              <dt className="micro">Acceso</dt>
              <dd className="mt-2 text-[14px] font-semibold leading-snug">
                Público<br />
                <span className="text-ink-faint">para consultar</span>
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="shell py-14">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="micro mb-2">Recién incorporados</p>
            <h2 className="font-display text-[30px] font-bold">Novedades del fondo</h2>
          </div>
          <Link href="/catalogo" className="btn-outline btn-sm">
            Ver catálogo completo
          </Link>
        </div>

        {latest.length === 0 ? (
          <EmptyState
            title="El catálogo todavía está vacío"
            description="Cuando se añada el primer libro aparecerá aquí. El personal puede incorporar títulos desde el panel."
            action={
              <Link href="/login" className="btn-primary">
                Acceder al panel
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

      {categories.length > 0 ? (
        <section className="border-t-2 border-line bg-surface">
          <div className="shell py-14">
            <p className="micro mb-2">Explora el fondo</p>
            <h2 className="font-display text-[30px] font-bold">Por categoría</h2>

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
