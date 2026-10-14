import Link from "next/link";

import { AUDIT_LABELS } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { formatDate, formatDateTime, pluralize } from "@/lib/format";
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
  const isOwner = user.role === "OWNER";

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

  const activity = isOwner
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
          label={t("Títulos")}
          value={totalBooks}
          hint={t("Libros distintos en el fondo")}
        />
        <StatTile
          label={t("Ejemplares")}
          value={copies._sum.copies ?? 0}
          hint={t("Suma de copias físicas")}
        />
        <StatTile
          label={t("En préstamo")}
          value={activeLoans}
          hint={t(overdueLoans === 1 ? "{n} vencido" : "{n} vencidos", {
            n: overdueLoans,
          })}
        />
        <StatTile
          label={t("Reservas pendientes")}
          value={activeReservations}
          hint={t("Libros esperando estar libres")}
        />
        <StatTile
          label={t("Lectores activos")}
          value={readers}
          hint={t("Personas con carné en vigor")}
        />
        <StatTile
          label={isOwner ? t("Usuarios editores") : t("Tu rol")}
          value={isOwner ? editors : t("Editor")}
          hint={
            isOwner
              ? t("Cuentas además de la tuya")
              : t("Puedes gestionar préstamos y libros")
          }
        />
      </section>

      <section className="flex flex-wrap items-center gap-2.5 border-2 border-line bg-surface p-4">
        <span className="micro mr-1">{t("Acciones rápidas")}</span>
        <Link href="/panel/prestamos/nuevo" className="btn-primary btn-sm">
          {t("Registrar préstamo")}
        </Link>
        <Link href="/panel/libros/nuevo" className="btn-outline btn-sm">
          {t("Añadir libro")}
        </Link>
        <Link href="/panel/lectores" className="btn-outline btn-sm">
          {t("Lectores")}
        </Link>
        {overdueLoans > 0 ? (
          <Link href="/panel/prestamos?estado=vencidos" className="btn-outline btn-sm text-danger">
            {t("Ver vencidos ({n})", { n: overdueLoans })}
          </Link>
        ) : null}
        {isOwner ? (
          <Link href="/panel/usuarios" className="btn-outline btn-sm">
            {t("Gestionar usuarios")}
          </Link>
        ) : null}
        <Link href="/catalogo" className="btn-ghost btn-sm">
          {t("Ver catálogo público")}
        </Link>
      </section>

      <div className="grid gap-9 lg:grid-cols-[1.3fr_1fr]">
        <section>
          <div className="mb-4 flex items-end justify-between gap-3">
            <h2 className="font-display text-[22px] font-bold">
              {t("Últimos cambios")}
            </h2>
            <Link href="/panel/libros" className="text-[13px] font-semibold text-accent underline underline-offset-2">
              {t("Ver todos")}
            </Link>
          </div>

          {recentBooks.length === 0 ? (
            <div className="border-2 border-dashed border-hairline bg-surface p-8 text-center">
              <p className="text-[14px] text-ink-soft">
                {t("Todavía no hay libros.")}{" "}
                <Link href="/panel/libros/nuevo" className="font-semibold text-accent underline underline-offset-2">
                  {t("Añade el primero")}
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
                    {t("Editar")}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-4 font-display text-[22px] font-bold">
            {t("Actividad reciente")}
          </h2>

          {!isOwner ? (
            <div className="border-2 border-dashed border-hairline bg-surface p-6 text-[13px] text-ink-soft">
              {t(
                "El historial de actividad está disponible para la cuenta de dueño de la plataforma.",
              )}
            </div>
          ) : activity.length === 0 ? (
            <div className="border-2 border-dashed border-hairline bg-surface p-6 text-[13px] text-ink-soft">
              {t("Aún no se ha registrado ninguna acción.")}
            </div>
          ) : (
            <ol className="border-2 border-line bg-surface">
              {activity.map((entry) => (
                <li
                  key={entry.id}
                  className="border-b border-hairline px-4 py-3 last:border-b-0"
                >
                  <p className="text-[13px] font-semibold">
                    {t(AUDIT_LABELS[entry.action] ?? entry.action)}
                  </p>
                  <p className="mt-0.5 text-[13px] text-ink-soft">{entry.summary}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-wide text-ink-faint">
                    {entry.user?.displayName ?? t("Sistema")} ·{" "}
                    {formatDateTime(entry.createdAt)}
                  </p>
                </li>
              ))}
            </ol>
          )}

          <p className="mt-3 text-[12px] text-ink-faint">
            {t(pluralize(editors, "cuenta editora", "cuentas editoras"))}{" "}
            {t("en la plataforma.")}
          </p>
        </section>
      </div>
    </div>
  );
}
