import Link from "next/link";

import { AUDIT_LABELS } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { formatDate, formatDateTime, pluralize } from "@/lib/format";
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
  const user = await requireUser();
  const isOwner = user.role === "OWNER";

  const [totalBooks, copies, categories, editors, recentBooks] = await Promise.all([
    prisma.book.count(),
    prisma.book.aggregate({ _sum: { copies: true } }),
    prisma.book.findMany({ distinct: ["category"], select: { category: true } }),
    prisma.user.count({ where: { role: "EDITOR" } }),
    prisma.book.findMany({ orderBy: { updatedAt: "desc" }, take: 6 }),
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
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Títulos" value={totalBooks} hint="Libros distintos en el fondo" />
        <StatTile
          label="Ejemplares"
          value={copies._sum.copies ?? 0}
          hint="Suma de copias físicas"
        />
        <StatTile label="Categorías" value={categories.length} hint="Áreas temáticas" />
        <StatTile
          label={isOwner ? "Usuarios editores" : "Tu rol"}
          value={isOwner ? editors : "Editor"}
          hint={isOwner ? "Cuentas además de la tuya" : "Puedes añadir y editar libros"}
        />
      </section>

      <section className="flex flex-wrap items-center gap-2.5 border-2 border-line bg-surface p-4">
        <span className="micro mr-1">Acciones rápidas</span>
        <Link href="/panel/libros/nuevo" className="btn-primary btn-sm">
          Añadir libro
        </Link>
        <Link href="/panel/libros" className="btn-outline btn-sm">
          Gestionar libros
        </Link>
        {isOwner ? (
          <Link href="/panel/usuarios" className="btn-outline btn-sm">
            Gestionar usuarios
          </Link>
        ) : null}
        <Link href="/catalogo" className="btn-ghost btn-sm">
          Ver catálogo público
        </Link>
      </section>

      <div className="grid gap-9 lg:grid-cols-[1.3fr_1fr]">
        <section>
          <div className="mb-4 flex items-end justify-between gap-3">
            <h2 className="font-display text-[22px] font-bold">Últimos cambios</h2>
            <Link href="/panel/libros" className="text-[13px] font-semibold text-accent underline underline-offset-2">
              Ver todos
            </Link>
          </div>

          {recentBooks.length === 0 ? (
            <div className="border-2 border-dashed border-hairline bg-surface p-8 text-center">
              <p className="text-[14px] text-ink-soft">
                Todavía no hay libros.{" "}
                <Link href="/panel/libros/nuevo" className="font-semibold text-accent underline underline-offset-2">
                  Añade el primero
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
                    Editar
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-4 font-display text-[22px] font-bold">Actividad reciente</h2>

          {!isOwner ? (
            <div className="border-2 border-dashed border-hairline bg-surface p-6 text-[13px] text-ink-soft">
              El historial de actividad está disponible para la cuenta de dueño
              de la plataforma.
            </div>
          ) : activity.length === 0 ? (
            <div className="border-2 border-dashed border-hairline bg-surface p-6 text-[13px] text-ink-soft">
              Aún no se ha registrado ninguna acción.
            </div>
          ) : (
            <ol className="border-2 border-line bg-surface">
              {activity.map((entry) => (
                <li
                  key={entry.id}
                  className="border-b border-hairline px-4 py-3 last:border-b-0"
                >
                  <p className="text-[13px] font-semibold">
                    {AUDIT_LABELS[entry.action] ?? entry.action}
                  </p>
                  <p className="mt-0.5 text-[13px] text-ink-soft">{entry.summary}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-wide text-ink-faint">
                    {entry.user?.displayName ?? "Sistema"} ·{" "}
                    {formatDateTime(entry.createdAt)}
                  </p>
                </li>
              ))}
            </ol>
          )}

          <p className="mt-3 text-[12px] text-ink-faint">
            {pluralize(editors, "cuenta editora", "cuentas editoras")} en la plataforma.
          </p>
        </section>
      </div>
    </div>
  );
}
