import { CreateUserForm } from "@/components/forms/CreateUserForm";
import { PageTransition } from "@/components/PageTransition";
import { UserActions } from "@/components/UserActions";
import { requireManager } from "@/lib/auth";
import { formatDate, formatDateTime } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("panel.users.usuarios") };
}

export default async function UsersPage() {
  const [manager, t] = await Promise.all([requireManager(), getT()]);

  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    include: { createdBy: { select: { displayName: true } } },
  });

  const activeCount = users.filter((user) => user.active).length;

  return (
    <PageTransition>
    <div className="flex flex-col gap-8">
      <header>
        <h2 className="font-display text-[26px] font-bold">
          {t("panel.users.usuariosDeLaPlataforma")}
        </h2>
        <p className="mt-1.5 max-w-2xl text-[14px] text-ink-soft">
          {t(
            "panel.users.soloElDuenoPuedeCrearCuentasCadaCuentaCreadaAquiPuedeIniciarSesi",
          )}
        </p>
      </header>

      <section className="grid gap-8 lg:grid-cols-[1fr_1.5fr]">
        <div className="border-2 border-line bg-surface p-6">
          <h3 className="font-display text-[19px] font-bold">{t("panel.users.crearUnaCuenta")}</h3>
          <p className="mt-1 mb-5 text-[13px] text-ink-faint">
            {t("panel.users.laPersonaDeberaCambiarLaContrasenaLaPrimeraVezQueEntre")}
          </p>
          <CreateUserForm />
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-[19px] font-bold">
              {t("panel.users.cuentasN", { n: users.length })}
            </h3>
            <p className="text-[13px] text-ink-faint">
              {t(activeCount === 1 ? "panel.users.nActiva" : "panel.users.nActivas", {
                n: activeCount,
              })}
            </p>
          </div>

          <div className="overflow-x-auto border-2 border-line bg-surface">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <caption className="sr-only">{t("panel.users.cuentasDeLaPlataforma")}</caption>
              <thead>
                <tr className="border-b-2 border-line bg-paper">
                  <th scope="col" className="px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide">
                    {t("panel.users.persona")}
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide">
                    {t("panel.users.rol")}
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide">
                    {t("panel.users.estado")}
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide">
                    {t("panel.users.ultimoAcceso")}
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide">
                    {t("panel.users.acciones")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-hairline last:border-b-0 align-top">
                    <td className="px-4 py-3">
                      <p className="font-semibold">
                        {user.displayName}
                        {user.id === manager.id ? (
                          <span className="ml-2 text-[11px] font-semibold uppercase tracking-wide text-accent">
                            {t("panel.users.tu")}
                          </span>
                        ) : null}
                      </p>
                      <p className="font-mono text-[13px] text-ink-faint">{user.username}</p>
                      {user.createdBy ? (
                        <p className="mt-0.5 text-[12px] text-ink-faint">
                          {t("panel.users.creadaPorName", { name: user.createdBy.displayName })}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      {user.role === "OWNER" ? (
                        <span className="tag-accent">{t("panel.users.dueno")}</span>
                      ) : user.role === "ADMIN" ? (
                        <span className="tag-accent">{t("panel.users.administrador")}</span>
                      ) : (
                        <span className="tag-muted">{t("panel.users.editor")}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {user.active ? (
                        <span className="tag-ok">{t("panel.users.activa")}</span>
                      ) : (
                        <span className="tag-warn">{t("panel.users.desactivada")}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-ink-faint tabular-nums">
                      {user.lastLoginAt ? (
                        formatDateTime(user.lastLoginAt)
                      ) : (
                        <span className="text-ink-faint">{t("panel.users.nunca")}</span>
                      )}
                      <p className="mt-0.5 text-[12px]">
                        {t("panel.users.altaDate", { date: formatDate(user.createdAt) })}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <UserActions
                        userId={user.id}
                        username={user.username}
                        active={user.active}
                        isSelf={user.id === manager.id}
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
    </PageTransition>
  );
}
