import { redirect } from "next/navigation";

import { PageTransition } from "@/components/PageTransition";
import { Notice } from "@/components/Notice";
import { ChangePinForm } from "@/components/reader/ChangePinForm";
import { readerLogoutAction } from "@/lib/actions/reader-auth";
import { formatDateTime, formatDate } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";
import { requireReader } from "@/lib/reader-auth";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("reader.tabAccount") };
}

export default async function ReaderAccountPage() {
  const session = await requireReader();
  const t = await getT();

  const reader = await prisma.reader.findUnique({ where: { id: session.id } });
  if (!reader) redirect("/mi-biblioteca");

  const details = [
    { label: t("reader.fullNameCol"), value: reader.fullName },
    { label: t("reader.cardNumber"), value: reader.cardNumber ?? "—" },
    { label: t("reader.groupCol"), value: reader.groupName ?? "—" },
    { label: t("reader.emailCol"), value: reader.email ?? "—" },
    { label: t("reader.memberSince"), value: formatDate(reader.createdAt) },
    {
      label: t("reader.lastAccess"),
      value: reader.lastReaderLoginAt
        ? formatDateTime(reader.lastReaderLoginAt)
        : t("reader.never"),
    },
  ];

  return (
    <PageTransition>
      <div className="flex flex-col gap-7">
        <header>
          <h2 className="font-display text-[26px] font-bold">
            {t("reader.tabAccount")}
          </h2>
          <p className="mt-1.5 text-[14px] text-ink-soft">
            {t("reader.accountLead")}
          </p>
        </header>

        <section className="border-2 border-line bg-surface">
          <dl className="grid grid-cols-1 sm:grid-cols-2">
            {details.map((detail) => (
              <div
                key={detail.label}
                className="flex items-baseline justify-between gap-4 border-b border-hairline px-4 py-2.5 last:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0"
              >
                <dt className="text-[13px] font-medium text-ink-faint">
                  {detail.label}
                </dt>
                <dd className="text-right text-[14px] font-semibold">{detail.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="border-2 border-line bg-surface p-6">
          <h3 className="font-display text-[18px] font-semibold">
            {t("reader.changePinTitle")}
          </h3>
          <p className="mt-1 mb-5 text-[13px] text-ink-faint">
            {t("reader.changePinLead")}
          </p>
          <ChangePinForm />
        </section>

        <section className="border-2 border-line bg-surface p-6">
          <h3 className="font-display text-[18px] font-semibold">
            {t("reader.session")}
          </h3>
          <p className="mt-1 mb-4 text-[13px] text-ink-faint">
            {t("reader.sessionLead")}
          </p>
          <form action={readerLogoutAction}>
            <button type="submit" className="btn-outline">
              {t("reader.logout")}
            </button>
          </form>
        </section>

        <Notice tone="info">{t("reader.needHelp")}</Notice>
      </div>
    </PageTransition>
  );
}
