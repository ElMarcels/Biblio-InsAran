import { PageTransition } from "@/components/PageTransition";
import { SendTestEmailForm } from "@/components/panel/SendTestEmailForm";
import { requireManager } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { isMailConfigured, mailSettings } from "@/lib/mailer";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("panel.mail.title") };
}

export default async function MailTestPage() {
  await requireManager();
  const t = await getT();
  const configured = isMailConfigured();
  const settings = mailSettings();

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
              </>
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
