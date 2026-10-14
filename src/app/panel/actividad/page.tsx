import { AUDIT_LABELS } from "@/lib/audit";
import { requireOwner } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Actividad" };

export default async function ActivityPage() {
  await requireOwner();

  const entries = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { displayName: true, username: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h2 className="font-display text-[26px] font-bold">Historial de actividad</h2>
        <p className="mt-1.5 max-w-2xl text-[14px] text-ink-soft">
          Registro de las últimas {entries.length} acciones realizadas en la
          plataforma: altas de libros, ediciones, borrados y gestión de cuentas.
        </p>
      </header>

      {entries.length === 0 ? (
        <div className="border-2 border-dashed border-hairline bg-surface p-10 text-center text-[14px] text-ink-soft">
          Todavía no se ha registrado ninguna acción.
        </div>
      ) : (
        <ol className="border-2 border-line bg-surface">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex flex-col gap-1 border-b border-hairline px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:gap-4"
            >
              <span className="w-fit shrink-0 border border-line bg-paper px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
                {AUDIT_LABELS[entry.action] ?? entry.action}
              </span>
              <p className="min-w-0 flex-1 text-[14px]">{entry.summary}</p>
              <p className="shrink-0 text-[12px] text-ink-faint">
                {entry.user ? entry.user.displayName : "Sistema"}
                {" · "}
                <time dateTime={entry.createdAt.toISOString()}>
                  {formatDateTime(entry.createdAt)}
                </time>
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
