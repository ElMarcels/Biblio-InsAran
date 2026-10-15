import Link from "next/link";

import { AUDIT_LABELS } from "@/lib/audit";
import { isManagerRole, requireUser } from "@/lib/auth";
import { formatDate, formatDateTime } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";

function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="border-2 border-line bg-surface p-5">
      <p className="micro">{label}</p>
      <p className="mt-2 font-display text-[36px] font-bold leading-none tabular-nums">
        {value}
      </p>
      {hint ? <p className="mt-1.5 text-[12px] text-ink-faint">{hint}</p> : null}
    </div>
  );
}

export default async function PanelHomePage() {
  const [user, t] = await Promise.all([requireUser(), getT()]);
  const isManager = isManagerRole(user.role);

  const [totalBooks, copies, editors, recentBooks, activeLoans, overdueLoans, activeReservations, readers] =
    await Promise.all([
      prisma.book.count(),
      prisma.book.aggregate({ _sum: { copies: true } }),
      prisma.user.count({ where: { role: "EDITOR" } }),
      prisma.book.findMany({ orderBy: { updatedAt: "desc" }, take: 6 }),
      prisma.loan.count({ where: { returnedAt: null } }),
      prisma.loan.count({ where: { returnedAt: null, dueAt: { lt: new Date() } } }),
      prisma.reservation.count({ where: { status: "ACTIVE" } }),
      prisma.reader.count({ where: { active: true } }),
    ]);

  const activity = isManager
    ? await prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 7,
        include: { user: { select: { displayName: true } } },
      })
    : [];

  return (
    <div className="flex flex-col gap-9">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatTile
          label={t("panel.home.titulos")}
          value={totalBooks}
          hint={t("panel.home.librosDistintosEnElFondo")}
        />
        <StatTile
          label={t("panel.home.ejemplares")}
          value={copies._sum.copies ?? 0}
          hint={t("panel.home.sumaDeCopiasFisicas")}
        />
        <StatTile
          label={t("panel.home.enPrestamo")}
          value={activeLoans}
          hint={t(overdueLoans === 1 ? "panel.nVencido" : "panel.nVencidos", {
            n: overdueLoans,
          })}
        />
        <StatTile
          label={t("panel.home.reservasPendientes")}
          value={activeReservations}
          hint={t("panel.home.librosEsperandoEstarLibres")}
        />
        <StatTile
          label={t("panel.home.lectoresActivos")}
          value={readers}
          hint={t("panel.home.personasConCarneEnVigor")}
        />
        <StatTile
          label={isManager ? t("panel.home.usuariosEditores") : t("panel.home.tuRol")}
          value={isManager ? editors : t("panel.home.editor")}
          hint={
            isManager
              ? t("panel.home.cuentasAdemasDeLaTuya")
              : t("panel.home.puedesGestionarPrestamosYLibros")
          }
        />
      </section>

      <section className="flex flex-wrap items-center gap-2.5 border-2 border-line bg-surface p-4">
        <span className="micro mr-1">{t("panel.home.accionesRapidas")}</span>
        <Link href="/panel/prestamos/nuevo" className="btn-primary btn-sm">
          {t("panel.home.registrarPrestamo")}
        </Link>
        <Link href="/panel/libros/nuevo" className="btn-outline btn-sm">
          {t("panel.home.anadirLibro")}
        </Link>
        <Link href="/panel/lectores" className="btn-outline btn-sm">
          {t("panel.home.lectores")}
        </Link>
        <Link href="/panel/tareas" className="btn-outline btn-sm">
          {t("panel.home.bandejaDeTareas")}
        </Link>
        <Link href="/panel/colecciones" className="btn-outline btn-sm">
          {t("panel.home.listasCuradas")}
        </Link>
        <Link href="/panel/estadisticas" className="btn-outline btn-sm">
          {t("panel.home.estadisticas")}
        </Link>
        {overdueLoans > 0 ? (
          <Link href="/panel/prestamos?estado=vencidos" className="btn-outline btn-sm text-danger">
            {t("panel.home.verVencidosN", { n: overdueLoans })}
          </Link>
        ) : null}
        {isManager ? (
          <Link href="/panel/usuarios" className="btn-outline btn-sm">
            {t("panel.home.gestionarUsuarios")}
          </Link>
        ) : null}
        <Link href="/catalogo" className="btn-ghost btn-sm">
          {t("panel.home.verCatalogoPublico")}
        </Link>
      </section>

      <div className="grid gap-9 lg:grid-cols-[1.3fr_1fr]">
        <section>
          <div className="mb-4 flex items-end justify-between gap-3">
            <h2 className="font-display text-[22px] font-bold">
              {t("panel.home.ultimosCambios")}
            </h2>
            <Link href="/panel/libros" className="text-[13px] font-semibold text-accent underline underline-offset-2">
              {t("panel.home.verTodos")}
            </Link>
          </div>

          {recentBooks.length === 0 ? (
            <div className="border-2 border-dashed border-hairline bg-surface p-8 text-center">
              <p className="text-[14px] text-ink-soft">
                {t("panel.home.todaviaNoHayLibros")}{" "}
                <Link href="/panel/libros/nuevo" className="font-semibold text-accent underline underline-offset-2">
                  {t("panel.home.anadeElPrimero")}
                </Link>
                .
              </p>
            </div>
          ) : (
            <ul className="border-2 border-line bg-surface">
              {recentBooks.map((book) => (
                <li
                  key={book.id}
                  className="flex items-center gap-4 border-b border-hairline px-4 py-3 last:border-b-0"
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/libro/${book.id}`}
                      className="block truncate font-semibold hover:text-accent"
                    >
                      {book.title}
                    </Link>
                    <p className="truncate text-[13px] text-ink-faint">
                      {book.author} · {book.category}
                    </p>
                  </div>
                  <span className="hidden shrink-0 text-[12px] text-ink-faint sm:block">
                    {formatDate(book.updatedAt)}
                  </span>
                  <Link
                    href={`/panel/libros/${book.id}/editar`}
                    className="btn-outline btn-sm shrink-0"
                  >
                    {t("panel.home.editar")}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-4 font-display text-[22px] font-bold">
            {t("panel.home.actividadReciente")}
          </h2>

          {!isManager ? (
            <div className="border-2 border-dashed border-hairline bg-surface p-6 text-[13px] text-ink-soft">
              {t(
                "panel.home.elHistorialDeActividadEstaDisponibleParaLaCuentaDeDuenoDeLaPlata",
              )}
            </div>
          ) : activity.length === 0 ? (
            <div className="border-2 border-dashed border-hairline bg-surface p-6 text-[13px] text-ink-soft">
              {t("panel.home.aunNoSeHaRegistradoNingunaAccion")}
            </div>
          ) : (
            <ol className="border-2 border-line bg-surface">
              {activity.map((entry) => (
                <li
                  key={entry.id}
                  className="border-b border-hairline px-4 py-3 last:border-b-0"
                >
                  <p className="text-[13px] font-semibold">
                    {t(AUDIT_LABELS[entry.action]) || entry.action}
                  </p>
                  <p className="mt-0.5 text-[13px] text-ink-soft">{entry.summary}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-wide text-ink-faint">
                    {entry.user?.displayName ?? t("panel.home.sistema")} ·{" "}
                    {formatDateTime(entry.createdAt)}
                  </p>
                </li>
              ))}
            </ol>
          )}

          <p className="mt-3 text-[12px] text-ink-faint">
            {t(editors === 1 ? "panel.nCuentaEditora" : "panel.nCuentasEditoras", {
              n: editors,
            })}{" "}
            {t("panel.home.enLaPlataforma")}
          </p>
        </section>
      </div>
    </div>
  );
}
