import Link from "next/link";

import { PageTransition } from "@/components/PageTransition";
import { SendTestEmailForm } from "@/components/panel/SendTestEmailForm";
import { requireManager } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { isMailConfigured, mailSettings } from "@/lib/mailer";
import { prisma } from "@/lib/prisma";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("panel.mail.title") };
}

export default async function MailTestPage() {
  await requireManager();
  const t = await getT();
  const configured = isMailConfigured();
  const settings = mailSettings();
  const cronEnabled = Boolean(process.env.CRON_SECRET);

  const [sentCount, failedCount, pendingCount] = await Promise.all([
    prisma.notification.count({ where: { to: { not: "" }, sentAt: { not: null } } }),
    prisma.notification.count({
      where: { to: { not: "" }, sentAt: null, error: { not: null } },
    }),
    prisma.notification.count({
      where: { to: { not: "" }, sentAt: null, error: null },
    }),
  ]);

  return (
    <PageTransition>
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="font-display text-[26px] font-bold">{t("panel.mail.title")}</h2>
          <p className="mt-1 max-w-3xl text-[14px] text-ink-soft">
            {t("panel.mail.description")}
          </p>
        </div>

        <section className="border-2 border-line bg-surface">
          <div className="border-b-2 border-line bg-paper px-4 py-3">
            <h3 className="font-display text-[18px] font-bold">{t("panel.mail.status")}</h3>
          </div>
          <div className="grid gap-2 px-4 py-4 text-[14px] sm:grid-cols-2">
            <div>
              <p className="text-ink-faint">{t("panel.mail.configured")}</p>
              <p className="font-semibold">
                {configured ? t("common.yes") : t("common.no")}
              </p>
            </div>
            {configured && settings ? (
              <>
                <div>
                  <p className="text-ink-faint">SMTP_HOST</p>
                  <p className="font-mono text-[13px]">{settings.host}</p>
                </div>
                <div>
                  <p className="text-ink-faint">SMTP_PORT</p>
                  <p className="font-mono text-[13px]">
                    {settings.port} {settings.secure ? "(TLS)" : "(STARTTLS)"}
                  </p>
                </div>
                <div>
                  <p className="text-ink-faint">SMTP_USER</p>
                  <p className="font-mono text-[13px]">{settings.user || "—"}</p>
                </div>
                <div>
                  <p className="text-ink-faint">SMTP_FROM</p>
                  <p className="font-mono text-[13px]">{settings.from}</p>
                </div>
                <div>
                  <p className="text-ink-faint">{t("panel.mail.password")}</p>
                  <p className="font-semibold">
                    {settings.pass
                      ? t("panel.mail.passwordSet")
                      : t("panel.mail.passwordMissing")}
                  </p>
                </div>
              </>
            ) : null}
          </div>
          <p className="border-t-2 border-line px-4 py-3 text-[12.5px] text-ink-faint">
            {t("panel.mail.hint")}
          </p>
        </section>

        <section className="border-2 border-line bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-line bg-paper px-4 py-3">
            <h3 className="font-display text-[18px] font-bold">{t("panel.mail.outbox")}</h3>
            <Link href="/panel/correo/salida" className="btn-outline btn-sm">
              {t("panel.mail.openOutbox")}
            </Link>
          </div>
          <div className="grid gap-4 px-4 py-4 text-[14px] sm:grid-cols-3">
            <Link
              href="/panel/correo/salida?estado=enviados"
              className="border-2 border-line bg-paper px-3 py-2.5 transition duration-150 hover:-translate-y-0.5 hover:shadow-[2px_2px_0_0_var(--color-line)]"
            >
              <p className="text-[12px] uppercase tracking-wide text-ink-faint">
                {t("panel.mail.sentCount")}
              </p>
              <p className="font-display text-[24px] font-bold tabular-nums text-ok">
                {sentCount}
              </p>
            </Link>
            <Link
              href="/panel/correo/salida?estado=fallidos"
              className="border-2 border-line bg-paper px-3 py-2.5 transition duration-150 hover:-translate-y-0.5 hover:shadow-[2px_2px_0_0_var(--color-line)]"
            >
              <p className="text-[12px] uppercase tracking-wide text-ink-faint">
                {t("panel.mail.failedCount")}
              </p>
              <p className="font-display text-[24px] font-bold tabular-nums text-danger">
                {failedCount}
              </p>
            </Link>
            <Link
              href="/panel/correo/salida?estado=pendientes"
              className="border-2 border-line bg-paper px-3 py-2.5 transition duration-150 hover:-translate-y-0.5 hover:shadow-[2px_2px_0_0_var(--color-line)]"
            >
              <p className="text-[12px] uppercase tracking-wide text-ink-faint">
                {t("panel.mail.pendingCount")}
              </p>
              <p className="font-display text-[24px] font-bold tabular-nums text-warn">
                {pendingCount}
              </p>
            </Link>
          </div>
          <div className="border-t-2 border-line px-4 py-3 text-[13px]">
            <p className="font-semibold">
              {t("panel.mail.cron")}:{" "}
              <span className={cronEnabled ? "text-ok" : "text-warn"}>
                {cronEnabled ? t("panel.mail.cronOn") : t("panel.mail.cronOff")}
              </span>
            </p>
            <p className="mt-1 text-ink-faint">{t("panel.mail.cronDesc")}</p>
            {!cronEnabled ? (
              <p className="mt-1 text-warn">{t("panel.mail.cronHint")}</p>
            ) : null}
          </div>
        </section>

        <section className="border-2 border-line bg-surface p-6">
          <h3 className="font-display text-[18px] font-semibold">
            {t("panel.mail.sendTest")}
          </h3>
          <p className="mt-1 mb-5 max-w-2xl text-[13px] text-ink-faint">
            {t("panel.mail.sendTestDesc")}
          </p>
          <div className="max-w-lg">
            <SendTestEmailForm defaultEmail="" />
          </div>
        </section>
      </div>
    </PageTransition>
  );
}
