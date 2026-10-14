import type { Prisma } from "@prisma/client";
import Link from "next/link";

import { EmptyState } from "@/components/EmptyState";
import { Notice } from "@/components/Notice";
import { Pagination } from "@/components/Pagination";
import { ReaderForm, EMPTY_READER } from "@/components/forms/ReaderForm";
import { ReaderStatusButton } from "@/components/panel/ReaderStatusButton";
import { requireUser } from "@/lib/auth";
import { PANEL_PAGE_SIZE } from "@/lib/constants";
import { getT } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Lectores") };
}

const FLASH: Record<string, string> = {
  creado: "El lector o lectora se ha dado de alta.",
};

function one(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function ReadersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser();
  const t = await getT();
  const params = await searchParams;
  const query = one(params.q).trim();
  const aviso = one(params.aviso);
  const requestedPage = Math.max(1, Number.parseInt(one(params.pagina) || "1", 10) || 1);

  const where: Prisma.ReaderWhereInput = query
    ? {
        OR: [
          { fullName: { contains: query, mode: "insensitive" } },
          { cardNumber: { contains: query, mode: "insensitive" } },
          { groupName: { contains: query, mode: "insensitive" } },
        ],
      }
    : {};

  const total = await prisma.reader.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / PANEL_PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);

  const readers = await prisma.reader.findMany({
    where,
    orderBy: [{ fullName: "asc" }],
    skip: (page - 1) * PANEL_PAGE_SIZE,
    take: PANEL_PAGE_SIZE,
    include: { _count: { select: { loans: { where: { returnedAt: null } } } } },
  });

  const hrefFor = (targetPage: number) => {
    const search = new URLSearchParams();
    if (query) search.set("q", query);
    if (targetPage > 1) search.set("pagina", String(targetPage));
    const suffix = search.toString();
    return suffix ? `/panel/lectores?${suffix}` : "/panel/lectores";
  };

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h2 className="font-display text-[26px] font-bold">{t("Lectores y lectoras")}</h2>
        <p className="mt-1.5 max-w-2xl text-[14px] text-ink-soft">
          {t(
            "Personas que pueden llevarse libros en préstamo. No necesitan cuenta: el personal registra sus préstamos y reservas desde aquí.",
          )}
        </p>
      </header>

      {FLASH[aviso] ? <Notice tone="success">{t(FLASH[aviso])}</Notice> : null}

      <section className="border-2 border-line bg-surface p-6">
        <h3 className="font-display text-[18px] font-semibold">{t("Dar de alta un lector o lectora")}</h3>
        <div className="mt-4">
          <ReaderForm mode="create" values={EMPTY_READER} />
        </div>
      </section>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="font-display text-[20px] font-semibold">{t("Listado")}</h3>
          <p className="mt-1 text-[14px] text-ink-soft tabular-nums">
            {total === 1 ? t("1 persona") : t("{n} personas", { n: total })}
            {query ? t(" para “{query}”", { query }) : ""}
          </p>
        </div>
      </div>

      <form action="/panel/lectores" method="get" className="flex flex-wrap items-end gap-3 border-2 border-line bg-surface p-4">
        <div className="min-w-56 flex-1">
          <label htmlFor="q" className="label">
            {t("Buscar")}
          </label>
          <input
            id="q"
            name="q"
            defaultValue={query}
            className="input"
            placeholder={t("Nombre, carné o grupo…")}
            autoComplete="off"
          />
        </div>
        <button type="submit" className="btn-primary">
          {t("Buscar")}
        </button>
        {query ? (
          <Link href="/panel/lectores" className="btn-ghost">
            {t("Limpiar")}
          </Link>
        ) : null}
      </form>

      {readers.length === 0 ? (
        <EmptyState
          title={query ? t("Sin resultados") : t("Aún no hay lectores")}
          description={
            query
              ? t("No hay personas que coincidan con esa búsqueda.")
              : t(
                  "Da de alta al primer lector o lectora para empezar a registrar préstamos.",
                )
          }
        />
      ) : (
        <div className="overflow-x-auto border-2 border-line bg-surface">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <caption className="sr-only">{t("Listado de lectores")}</caption>
            <thead>
              <tr className="border-b-2 border-line bg-paper">
                <th scope="col" className="px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide">
                  {t("Persona")}
                </th>
                <th scope="col" className="px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide">
                  {t("Carné")}
                </th>
                <th scope="col" className="px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide">
                  {t("Grupo")}
                </th>
                <th scope="col" className="px-4 py-2.5 text-right text-[12px] font-semibold uppercase tracking-wide">
                  {t("En préstamo")}
                </th>
                <th scope="col" className="px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide">
                  {t("Estado")}
                </th>
                <th scope="col" className="px-4 py-2.5 text-right text-[12px] font-semibold uppercase tracking-wide">
                  {t("Acciones")}
                </th>
              </tr>
            </thead>
            <tbody>
              {readers.map((reader) => (
                <tr key={reader.id} className="border-b border-hairline last:border-b-0 align-top">
                  <td className="px-4 py-3">
                    <Link href={`/panel/lectores/${reader.id}`} className="font-semibold hover:text-accent">
                      {reader.fullName}
                    </Link>
                    {reader.email ? (
                      <p className="text-[13px] text-ink-faint">{reader.email}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 font-mono text-[13px]">
                    {reader.cardNumber ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-[14px]">{reader.groupName ?? "—"}</td>
                  <td className="px-4 py-3 text-right text-[14px] tabular-nums">
                    {reader._count.loans}
                  </td>
                  <td className="px-4 py-3">
                    <span className={reader.active ? "tag-muted" : "tag-accent"}>
                      {reader.active ? t("Activo") : t("Baja")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      <Link href={`/panel/lectores/${reader.id}`} className="btn-outline btn-sm">
                        {t("Ver ficha")}
                      </Link>
                      <ReaderStatusButton readerId={reader.id} active={reader.active} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex justify-center">
          <Pagination page={page} totalPages={totalPages} hrefFor={hrefFor} />
        </div>
      ) : null}
    </div>
  );
}
