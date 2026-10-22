import { redirect } from "next/navigation";

import { EmptyState } from "@/components/EmptyState";
import { PageTransition } from "@/components/PageTransition";
import {
  MarkAllNotificationsReadButton,
  MarkNotificationReadButton,
} from "@/components/reader/NotificationActions";
import { formatDateTime } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";
import { requireReader } from "@/lib/reader-auth";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("reader.tabNotifications") };
}

/**
 * Bandeja de avisos de la persona lectora. Cada aviso se guarda también en la
 * base de datos, aunque el correo no se haya podido enviar, para que nunca
 * se pierda información.
 */
export default async function ReaderNotificationsPage() {
  const session = await requireReader();
  const t = await getT();

  const reader = await prisma.reader.findUnique({
    where: { id: session.id },
    select: { id: true },
  });
  if (!reader) redirect("/mi-biblioteca");

  const notifications = await prisma.notification.findMany({
    where: { readerId: reader.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const unread = notifications.filter((notification) => !notification.readAt).length;

  return (
    <PageTransition>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <header>
            <h2 className="font-display text-[26px] font-bold">
              {t("reader.tabNotifications")}
            </h2>
            <p className="mt-1 max-w-3xl text-[14px] text-ink-soft">
              {t("reader.notificationsLead")}
            </p>
          </header>
          {unread > 0 ? <MarkAllNotificationsReadButton /> : null}
        </div>

        {notifications.length === 0 ? (
          <EmptyState
            title={t("reader.noNotifications")}
            description={t("reader.notificationsLead")}
          />
        ) : (
          <ul className="divide-y divide-hairline border-2 border-line bg-surface">
            {notifications.map((notification) => (
              <li
                key={notification.id}
                className={
                  notification.readAt
                    ? "flex flex-wrap items-start gap-x-4 gap-y-2 px-4 py-4"
                    : "flex flex-wrap items-start gap-x-4 gap-y-2 border-l-4 border-accent bg-paper px-4 py-4"
                }
              >
                <div className="min-w-[220px] flex-1">
                  <p className="font-semibold">{notification.subject}</p>
                  <p className="mt-1 max-w-2xl whitespace-pre-line text-[13.5px] text-ink-soft">
                    {notification.body}
                  </p>
                  <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] tabular-nums text-ink-faint">
                    <span>{formatDateTime(notification.createdAt)}</span>
                    {notification.sentAt ? (
                      <span>{t("reader.sentByEmail")}</span>
                    ) : (
                      <span>{t("reader.onlyInInbox")}</span>
                    )}
                    {!notification.readAt ? (
                      <span className="border-2 border-line px-1.5 py-0.5 font-semibold text-ink">
                        {t("reader.unread")}
                      </span>
                    ) : null}
                  </p>
                </div>
                {!notification.readAt ? (
                  <MarkNotificationReadButton notificationId={notification.id} />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageTransition>
  );
}
