"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import type { GroupActorType } from "@/lib/groups/auth";

import { useT } from "../i18n/LocaleProvider";

type GroupSummary = {
  id: string;
  name: string;
  description: string;
  role: "OWNER" | "MEMBER";
  memberCount: number;
  lastMessage: string | null;
};

type Invitation = {
  id: string;
  groupId: string;
  groupName: string;
  invitedByName: string;
};

export function GroupHub({
  actorType,
  basePath,
  groups,
  invitations,
}: {
  actorType: GroupActorType;
  basePath: string;
  groups: GroupSummary[];
  invitations: Invitation[];
}) {
  const t = useT();
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyInvitation, setBusyInvitation] = useState<string | null>(null);
  const headers = { "Content-Type": "application/json", "x-aranos-actor": actorType };

  async function createGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/grupos", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: form.get("name"),
          description: form.get("description"),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "groups.errors.invalidData");
        return;
      }
      router.push(`${basePath}/${result.id}`);
      router.refresh();
    } catch {
      setError("groups.errors.network");
    } finally {
      setCreating(false);
    }
  }

  async function respondToInvitation(invitation: Invitation, decision: "ACCEPTED" | "DECLINED") {
    setBusyInvitation(invitation.id);
    setError(null);
    try {
      const response = await fetch(`/api/grupos/invitaciones/${invitation.id}`, {
        method: "POST",
        headers,
        body: JSON.stringify({ decision }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "groups.errors.network");
        return;
      }
      if (decision === "ACCEPTED") router.push(`${basePath}/${invitation.groupId}`);
      router.refresh();
    } catch {
      setError("groups.errors.network");
    } finally {
      setBusyInvitation(null);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="micro mb-1">AranOS</p>
        <h2 className="font-display text-[28px] font-bold">{t("groups.title")}</h2>
        <p className="mt-2 max-w-3xl text-[14px] text-ink-soft">{t("groups.lead")}</p>
      </header>

      {error ? (
        <p role="alert" className="border-2 border-danger bg-danger/5 px-4 py-3 text-[14px] text-danger">
          {t(error as never)}
        </p>
      ) : null}

      {invitations.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h3 className="font-display text-[20px] font-bold">{t("groups.invitations")}</h3>
          <ul className="divide-y divide-hairline border-2 border-line bg-surface">
            {invitations.map((invitation) => (
              <li key={invitation.id} className="flex flex-wrap items-center gap-3 px-4 py-4">
                <p className="min-w-[220px] flex-1 text-[14px]">
                  <strong>{invitation.groupName}</strong>
                  <span className="block text-[13px] text-ink-soft">
                    {t("groups.invitedBy", { name: invitation.invitedByName })}
                  </span>
                </p>
                <button
                  type="button"
                  disabled={busyInvitation === invitation.id}
                  onClick={() => respondToInvitation(invitation, "ACCEPTED")}
                  className="btn-primary btn-sm disabled:opacity-50"
                >
                  {t("groups.accept")}
                </button>
                <button
                  type="button"
                  disabled={busyInvitation === invitation.id}
                  onClick={() => respondToInvitation(invitation, "DECLINED")}
                  className="btn-outline btn-sm disabled:opacity-50"
                >
                  {t("groups.decline")}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">
        <div className="flex flex-col gap-4">
          <h3 className="font-display text-[20px] font-bold">{t("groups.yourGroups")}</h3>
          {groups.length === 0 ? (
            <div className="border-2 border-dashed border-line px-5 py-8 text-center">
              <p className="font-semibold">{t("groups.noGroups")}</p>
              <p className="mt-1 text-[13px] text-ink-soft">{t("groups.noGroupsDescription")}</p>
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {groups.map((group) => (
                <li key={group.id}>
                  <Link
                    href={`${basePath}/${group.id}`}
                    className="flex h-full flex-col border-2 border-line bg-surface p-4 transition-transform hover:-translate-y-0.5 hover:bg-paper"
                  >
                    <span className="flex items-start justify-between gap-3">
                      <strong className="font-display text-[18px]">{group.name}</strong>
                      <span className="tag-muted">{t(group.role === "OWNER" ? "groups.owner" : "groups.member")}</span>
                    </span>
                    {group.description ? (
                      <span className="mt-2 text-[13px] text-ink-soft">{group.description}</span>
                    ) : null}
                    <span className="mt-4 text-[12px] text-ink-faint">
                      {t("groups.memberCount", { count: group.memberCount })}
                    </span>
                    <span className="mt-2 line-clamp-2 text-[13px] text-ink-soft">
                      {group.lastMessage ?? t("groups.noMessagesYet")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <form onSubmit={createGroup} className="flex flex-col gap-4 border-2 border-line bg-paper p-5">
          <div>
            <h3 className="font-display text-[20px] font-bold">{t("groups.createGroup")}</h3>
            <p className="mt-1 text-[13px] text-ink-soft">{t("groups.createDescription")}</p>
          </div>
          <label className="flex flex-col gap-1 text-[13px] font-semibold">
            {t("groups.name")}
            <input name="name" className="input" minLength={2} maxLength={60} required />
          </label>
          <label className="flex flex-col gap-1 text-[13px] font-semibold">
            {t("groups.description")}
            <textarea name="description" className="input min-h-20 resize-y" maxLength={300} />
          </label>
          <button type="submit" disabled={creating} className="btn-primary self-start disabled:opacity-50">
            {creating ? t("groups.creating") : t("groups.create")}
          </button>
        </form>
      </section>
    </div>
  );
}