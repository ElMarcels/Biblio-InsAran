import type { Prisma } from "@prisma/client";
import Link from "next/link";

import { EmptyState } from "@/components/EmptyState";
import { PageTransition } from "@/components/PageTransition";
import { Pagination } from "@/components/Pagination";
import { RetryNotificationButton } from "@/components/panel/RetryNotificationButton";
import { RetryUnsentNotificationsButton } from "@/components/panel/RetryUnsentNotificationsButton";
import { requireManager } from "@/lib/auth";
import { classNames, formatDateTime } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import type { TranslationKey } from "@/lib/i18n/translate";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 20;

const FILTERS = ["todos", "pendientes", "fallidos", "enviados"] as const;
type Filter = (typeof FILTERS)[number];

const FILTER_LABEL: Record<Filter, TranslationKey> = {
  todos: "panel.outbox.filterAll",
  pendientes: "panel.outbox.filterPending",
  fallidos: "panel.outbox.filterFailed",
  enviados: "panel.outbox.filterSent",
};

const KIND_LABEL: Record<string, TranslationKey> = {
  loan: "panel.outbox.kindLoan",
  reservation: "panel.outbox.kindReservation",
  overdue: "panel.outbox.kindOverdue",
  suspension: "panel.outbox.kindSuspension",
};

function one(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function statusOf(notification: {
  sentAt: Date | null;
  error: string | null;
}): { label: TranslationKey; className: string } {
  if (notification.sentAt) {
    return { label: "panel.outbox.sent", className: "tag-ok" };
  }
  if (notification.error) {
    return {
      label: "panel.outbox.failed",
      className: classNames("tag", "border-danger bg-danger-soft text-danger"),
    };
  }
  return { label: "panel.outbox.pending", className: "tag-warn" };
}

export async function generateMetadata() {
  const t = await getT();
  return { title: t("panel.outbox.title") };
}

export default async function OutboxPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireManager();
  const t = await getT();
  const params = await searchParams;

  const rawFilter = one(params.estado);
  const filter: Filter = (FILTERS as readonly string[]).includes(rawFilter)
    ? (rawFilter as Filter)
    : "todos";
  const query = one(params.q).trim();
  const requestedPage = Math.max(1, Number.parseInt(one(params.pagina) || "1", 10) || 1);

  // Solo tiene sentido vigilar los avisos que debían salir por correo.
  const scope: Prisma.NotificationWhereInput = { to: { not: "" } };
  const search: Prisma.NotificationWhereInput = query
    ? {
        OR: [
          { subject: { contains: query, mode: "insensitive" } },
          { to: { contains: query, mode: "insensitive" } },
          { reader: { fullName: { contains: query, mode: "insensitive" } } },
        ],
      }
    : {};

  const where: Prisma.NotificationWhereInput = { AND: [scope, search] };
  if (filter === "enviados") where.sentAt = { not: null };
  if (filter === "fallidos") {
    where.sentAt = null;
    where.error = { not: null };
  }
  if (filter === "pendientes") {
    where.sentAt = null;
    where.error = null;
  }

  const [total, sentCount, failedCount, pendingCount, unsent] = await Promise.all([
    prisma.notification.count({ where: { AND: [scope, search] } }),
    prisma.notification.count({
      where: { AND: [scope, search, { sentAt: { not: null } }] },
    }),
    prisma.notification.count({
      where: { AND: [scope, search, { sentAt: null, error: { not: null } }] },
    }),
    prisma.notification.count({
      where: { AND: [scope, search, { sentAt: null, error: null }] },
    }),
    prisma.notification.count({
      where: { AND: [scope, search, { sentAt: null }] },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: { reader: { select: { id: true, fullName: true } } },
  });

  const hrefFor = (targetPage: number) => {
    const searchParamsOut = new URLSearchParams();
    if (filter !== "todos") searchParamsOut.set("estado", filter);
    if (query) searchParamsOut.set("q", query);
    if (targetPage > 1) searchParamsOut.set("pagina", String(targetPage));
    const suffix = searchParamsOut.toString();
    return suffix ? `/panel/correo/salida?${suffix}` : "/panel/correo/salida";
  };

  const filterHref = (value: Filter) => {
    const searchParamsOut = new URLSearchParams();
    if (value !== "todos") searchParamsOut.set("estado", value);
    if (query) searchParamsOut.set("q", query);
    const suffix = searchParamsOut.toString();
    return suffix ? `/panel/correo/salida?${suffix}` : "/panel/correo/salida";
  };

  const counts: Record<Filter, number> = {
    todos: total,
    pendientes: pendingCount,
    fallidos: failedCount,
    enviados: sentCount,
  };

  return (
    <PageTransition>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <header>
            <p className="micro mb-2">
              <Link href="/panel/correo" className="hover:text-accent">
                {t("panel.mail.title")}
              </Link>
            </p>
            <h2 className="font-display text-[26px] font-bold">{t("panel.outbox.title")}</h2>
            <p className="mt-1 max-w-3xl text-[14px] text-ink-soft">
              {t("panel.outbox.description")}
            </p>
            <p className="mt-1 text-[12.5px] text-ink-faint">{t("panel.outbox.onlyEmail")}</p>
          </header>
          <RetryUnsentNotificationsButton count={unsent} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((value) => (
            <Link
              key={value}
              href={filterHref(value)}
              aria-current={value === filter ? "page" : undefined}
              className={classNames(
                "tag transition duration-150 hover:-translate-y-0.5",
                value === filter
                  ? "border-line bg-ink text-paper"
                  : "border-line bg-surface hover:bg-paper",
              )}
            >
              {t(FILTER_LABEL[value])}
              <span className="ml-1.5 tabular-nums opacity-70">{counts[value]}</span>
            </Link>
          ))}

          <form action="/panel/correo/salida" method="get" className="ml-auto flex items-center gap-2">
            {filter !== "todos" ? (
              <input type="hidden" name="estado" value={filter} />
            ) : null}
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder={t("panel.outbox.search")}
              aria-label={t("panel.outbox.search")}
              className="input h-9 min-w-[220px] py-0 text-[13px]"
            />
            <button type="submit" className="btn-outline btn-sm">
              {t("panel.outbox.searchButton")}
            </button>
          </form>
        </div>

        {notifications.length === 0 ? (
          <EmptyState
            title={t("panel.outbox.empty")}
            description={t("panel.outbox.emptyDesc")}
          />
        ) : (
          <div className="overflow-x-auto border-2 border-line bg-surface">
            <table className="w-full min-w-[900px] border-collapse text-left">
              <caption className="sr-only">{t("panel.outbox.title")}</caption>
              <thead>
                <tr className="border-b-2 border-line bg-paper">
                  <th scope="col" className="px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide">
                    {t("panel.outbox.date")}
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide">
                    {t("panel.outbox.recipient")}
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide">
                    {t("panel.outbox.subject")}
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide">
                    {t("panel.outbox.status")}
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-center text-[12px] font-semibold uppercase tracking-wide">
                    {t("panel.outbox.attempts")}
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right text-[12px] font-semibold uppercase tracking-wide">
                    {t("panel.outbox.actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {notifications.map((notification) => {
                  const status = statusOf(notification);
                  return (
                    <tr
                      key={notification.id}
                      className="border-b border-hairline align-top last:border-b-0"
                    >
                      <td className="px-4 py-3 text-[13px] tabular-nums text-ink-soft">
                        {formatDateTime(notification.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/panel/lectores/${notification.reader.id}`}
                          className="font-semibold hover:text-accent"
                        >
                          {notification.reader.fullName}
                        </Link>
                        <p className="font-mono text-[12px] text-ink-faint">{notification.to}</p>
                      </td>
                      <td className="max-w-[360px] px-4 py-3">
                        <p className="font-semibold">{notification.subject}</p>
                        <p className="mt-1 text-[12.5px] text-ink-faint">
                          {t(KIND_LABEL[notification.kind]) || notification.kind}
                        </p>
                        {notification.error ? (
                          <p
                            className="mt-1 line-clamp-3 text-[12px] text-danger"
                            title={notification.error}
                          >
                            {notification.error}
                          </p>
                        ) : null}
                        {notification.sentAt ? (
                          <p className="mt-1 text-[12px] tabular-nums text-ink-faint">
                            {t("panel.outbox.sentAt", {
                              date: formatDateTime(notification.sentAt),
                            })}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <span className={status.className}>{t(status.label)}</span>
                      </td>
                      <td className="px-4 py-3 text-center text-[13px] tabular-nums text-ink-soft">
                        {notification.attempts}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          {notification.sentAt ? (
                            <span className="text-[12.5px] text-ink-faint">—</span>
                          ) : (
                            <RetryNotificationButton notificationId={notification.id} />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} hrefFor={hrefFor} />
      </div>
    </PageTransition>
  );
}
