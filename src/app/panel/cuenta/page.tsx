import { ChangePasswordForm } from "@/components/forms/ChangePasswordForm";
import { requireUser } from "@/lib/auth";
import { formatDate, formatDateTime } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";
import { PageTransition } from "@/components/PageTransition";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("panel.account.miCuenta") };
}

export default async function AccountPage() {
  const [user, t] = await Promise.all([requireUser(), getT()]);
  const account = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      username: true,
      displayName: true,
      role: true,
      createdAt: true,
      lastLoginAt: true,
      mustChangePassword: true,
    },
  });

  return (
    <PageTransition>
    <div className="flex flex-col gap-8">
      <header>
        <h2 className="font-display text-[26px] font-bold">{t("panel.account.miCuenta")}</h2>
        <p className="mt-1.5 text-[14px] text-ink-soft">
          {t("panel.account.consultaTusDatosYCambiaTuContrasena")}
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
        <section className="border-2 border-line bg-surface p-6">
          <h3 className="font-display text-[19px] font-bold">{t("panel.account.datos")}</h3>
          <dl className="mt-4 flex flex-col divide-y divide-hairline border-t border-hairline">
            <div className="flex items-baseline justify-between gap-4 py-2.5">
              <dt className="text-[13px] text-ink-faint">{t("panel.account.nombre")}</dt>
              <dd className="text-[14px] font-semibold">{account?.displayName}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 py-2.5">
              <dt className="text-[13px] text-ink-faint">{t("panel.account.usuario")}</dt>
              <dd className="font-mono text-[14px] font-semibold">{account?.username}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 py-2.5">
              <dt className="text-[13px] text-ink-faint">{t("panel.account.rol")}</dt>
              <dd className="text-[14px] font-semibold">
                {account?.role === "OWNER"
                  ? t("panel.account.duenoDeLaPlataforma")
                  : account?.role === "ADMIN"
                    ? t("panel.account.adminDeLaPlataforma")
                    : t("panel.account.editor")}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 py-2.5">
              <dt className="text-[13px] text-ink-faint">{t("panel.account.alta")}</dt>
              <dd className="text-[14px] font-semibold">{formatDate(account?.createdAt)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 py-2.5">
              <dt className="text-[13px] text-ink-faint">{t("panel.account.ultimoAcceso")}</dt>
              <dd className="text-[14px] font-semibold">
                {account?.lastLoginAt ? formatDateTime(account.lastLoginAt) : "—"}
              </dd>
            </div>
          </dl>
        </section>

        <section className="border-2 border-line bg-surface p-6">
          <h3 className="font-display text-[19px] font-bold">
            {t("panel.account.cambiarContrasena")}
          </h3>
          {account?.mustChangePassword ? (
            <p className="mt-1.5 mb-5 border-l-4 border-accent bg-accent-soft px-3 py-2 text-[13px] font-medium text-accent">
              {t("panel.account.tuContrasenaEsProvisionalCambialaAhora")}
            </p>
          ) : (
            <p className="mt-1 mb-5 text-[13px] text-ink-faint">
              {t("panel.account.introduceTuContrasenaActualYLaNueva")}
            </p>
          )}
          <ChangePasswordForm />
        </section>
      </div>
    </div>
    </PageTransition>
  );
}
