import { CreateUserForm } from "@/components/forms/CreateUserForm";
import { UserActions } from "@/components/UserActions";
import { requireOwner } from "@/lib/auth";
import { formatDate, formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Usuarios" };

export default async function UsersPage() {
  const owner = await requireOwner();

  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    include: { createdBy: { select: { displayName: true } } },
  });

  const activeCount = users.filter((user) => user.active).length;

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h2 className="font-display text-[26px] font-bold">Usuarios de la plataforma</h2>
        <p className="mt-1.5 max-w-2xl text-[14px] text-ink-soft">
          Solo el dueño puede crear cuentas. Cada cuenta creada aquí puede
          iniciar sesión y añadir o editar libros en el catálogo.
        </p>
      </header>

      <section className="grid gap-8 lg:grid-cols-[1fr_1.5fr]">
        <div className="border-2 border-line bg-surface p-6">
          <h3 className="font-display text-[19px] font-bold">Crear una cuenta</h3>
          <p className="mt-1 mb-5 text-[13px] text-ink-faint">
            La persona deberá cambiar la contraseña la primera vez que entre.
          </p>
          <CreateUserForm />
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-[19px] font-bold">
              Cuentas ({users.length})
            </h3>
            <p className="text-[13px] text-ink-faint">
              {activeCount} {activeCount === 1 ? "activa" : "activas"}
            </p>
          </div>

          <div className="overflow-x-auto border-2 border-line bg-surface">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <caption className="sr-only">Cuentas de la plataforma</caption>
              <thead>
                <tr className="border-b-2 border-line bg-paper">
                  <th scope="col" className="px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide">
                    Persona
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide">
                    Rol
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide">
                    Estado
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide">
                    Último acceso
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-hairline last:border-b-0 align-top">
                    <td className="px-4 py-3">
                      <p className="font-semibold">
                        {user.displayName}
                        {user.id === owner.id ? (
                          <span className="ml-2 text-[11px] font-semibold uppercase tracking-wide text-accent">
                            tú
                          </span>
                        ) : null}
                      </p>
                      <p className="font-mono text-[13px] text-ink-faint">{user.username}</p>
                      {user.createdBy ? (
                        <p className="mt-0.5 text-[12px] text-ink-faint">
                          Creada por {user.createdBy.displayName}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      {user.role === "OWNER" ? (
                        <span className="tag-accent">Dueño</span>
                      ) : (
                        <span className="tag-muted">Editor</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {user.active ? (
                        <span className="tag-ok">Activa</span>
                      ) : (
                        <span className="tag-warn">Desactivada</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-ink-faint tabular-nums">
                      {user.lastLoginAt ? (
                        formatDateTime(user.lastLoginAt)
                      ) : (
                        <span className="text-ink-faint">Nunca</span>
                      )}
                      <p className="mt-0.5 text-[12px]">Alta: {formatDate(user.createdAt)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <UserActions
                        userId={user.id}
                        username={user.username}
                        active={user.active}
                        isSelf={user.id === owner.id}
                        isOwnerAccount={user.role === "OWNER"}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
