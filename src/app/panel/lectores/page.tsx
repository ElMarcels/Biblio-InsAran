import type { Prisma } from "@prisma/client";
import Link from "next/link";

import { EmptyState } from "@/components/EmptyState";
import { Notice } from "@/components/Notice";
import { Pagination } from "@/components/Pagination";
import { ReaderForm, EMPTY_READER } from "@/components/forms/ReaderForm";
import { ReaderStatusButton } from "@/components/panel/ReaderStatusButton";
import { requireUser } from "@/lib/auth";
import { PANEL_PAGE_SIZE } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import type { TranslationKey } from "@/lib/i18n/translate";
import { isSuspended } from "@/lib/library";
import { prisma } from "@/lib/prisma";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("panel.readers.lectores") };
}

const FLASH: Record<string, TranslationKey> = {
  creado: "panel.readers.flashCreated",
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
        <h2 className="font-display text-[26px] font-bold">{t("panel.readers.lectoresYLectoras")}</h2>
        <p className="mt-1.5 max-w-2xl text-[14px] text-ink-soft">
          {t(
            "panel.readers.personasQuePuedenLlevarseLibrosEnPrestamoNoNecesitanCuentaElPers",
          )}
        </p>
      </header>

      {FLASH[aviso] ? <Notice tone="success">{t(FLASH[aviso])}</Notice> : null}

      <section className="border-2 border-line bg-surface p-6">
        <h3 className="font-display text-[18px] font-semibold">{t("panel.readers.darDeAltaUnLectorOLectora")}</h3>
        <div className="mt-4">
          <ReaderForm mode="create" values={EMPTY_READER} />
        </div>
      </section>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="font-display text-[20px] font-semibold">{t("panel.readers.listado")}</h3>
          <p className="mt-1 text-[14px] text-ink-soft tabular-nums">
            {total === 1 ? t("panel.readers.onePerson") : t("panel.readers.nPeople", { n: total })}
            {query ? t("panel.readers.paraQuery", { query }) : ""}
          </p>
        </div>
      </div>

      <form action="/panel/lectores" method="get" className="flex flex-wrap items-end gap-3 border-2 border-line bg-surface p-4">
        <div className="min-w-56 flex-1">
          <label htmlFor="q" className="label">
            {t("panel.readers.buscar")}
          </label>
          <input
            id="q"
            name="q"
            defaultValue={query}
            className="input"
            placeholder={t("panel.readers.nombreCarneOGrupo")}
            autoComplete="off"
          />
        </div>
        <button type="submit" className="btn-primary">
          {t("panel.readers.buscar")}
        </button>
        {query ? (
          <Link href="/panel/lectores" className="btn-ghost">
            {t("panel.readers.limpiar")}
          </Link>
        ) : null}
      </form>

      {readers.length === 0 ? (
        <EmptyState
          title={query ? t("panel.readers.sinResultados") : t("panel.readers.aunNoHayLectores")}
          description={
            query
              ? t("panel.readers.noHayPersonasQueCoincidanConEsaBusqueda")
              : t(
                  "panel.readers.daDeAltaAlPrimerLectorOLectoraParaEmpezarARegistrarPrestamos",
                )
          }
        />
      ) : (
        <div className="overflow-x-auto border-2 border-line bg-surface">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <caption className="sr-only">{t("panel.readers.listadoDeLectores")}</caption>
            <thead>
              <tr className="border-b-2 border-line bg-paper">
                <th scope="col" className="px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide">
                  {t("panel.readers.persona")}
                </th>
                <th scope="col" className="px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide">
                  {t("panel.readers.carne")}
                </th>
                <th scope="col" className="px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide">
                  {t("panel.readers.grupo")}
                </th>
                <th scope="col" className="px-4 py-2.5 text-right text-[12px] font-semibold uppercase tracking-wide">
                  {t("panel.readers.enPrestamo")}
                </th>
                <th scope="col" className="px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide">
                  {t("panel.readers.estado")}
                </th>
                <th scope="col" className="px-4 py-2.5 text-right text-[12px] font-semibold uppercase tracking-wide">
                  {t("panel.readers.acciones")}
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
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={reader.active ? "tag-muted" : "tag-accent"}>
                        {reader.active ? t("panel.readers.activo") : t("panel.readers.baja")}
                      </span>
                      {isSuspended(reader) ? (
                        <span
                          className="tag-accent"
                          title={t("panel.readers.suspendidoHastaElDate", {
                            date: formatDate(reader.suspendedUntil),
                          })}
                        >
                          {t("panel.readers.suspendido")}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      <Link href={`/panel/lectores/${reader.id}`} className="btn-outline btn-sm">
                        {t("panel.readers.verFicha")}
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
