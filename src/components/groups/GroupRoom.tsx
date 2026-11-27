"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";

import type { GroupActorType } from "@/lib/groups/auth";

import { GroupVoiceCall } from "./GroupVoiceCall";
import { useT } from "../i18n/LocaleProvider";

type Message = { id: string; senderName: string; content: string; createdAt: string };
type Member = { id: string; name: string; role: "OWNER" | "MEMBER"; joinedAt: string };
type Invite = { id: string; name: string; createdAt: string };
type SearchResult = { id: string; type: GroupActorType; name: string; account: string };

export function GroupRoom({
  actorType,
  basePath,
  group,
  role,
  members,
  pendingInvitations,
  initialMessages,
}: {
  actorType: GroupActorType;
  basePath: string;
  group: { id: string; name: string; description: string };
  role: "OWNER" | "MEMBER";
  members: Member[];
  pendingInvitations: Invite[];
  initialMessages: Message[];
}) {
  const t = useT();
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviting, setInviting] = useState<string | null>(null);
  const [sentIds, setSentIds] = useState<string[]>([]);
  const [editingGroup, setEditingGroup] = useState(false);
  const [savingGroup, setSavingGroup] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState(false);
  const [groupError, setGroupError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageAtRef = useRef(initialMessages.at(-1)?.createdAt ?? null);
  const headers = { "Content-Type": "application/json", "x-aranos-actor": actorType };
  const endpoint = `/api/grupos/${group.id}`;

  const appendMessages = useCallback((incoming: Message[]) => {
    setMessages((current) => {
      const ids = new Set(current.map((message) => message.id));
      return [...current, ...incoming.filter((message) => !ids.has(message.id))].slice(-100);
    });
  }, []);

  useEffect(() => {
    const timer = window.setInterval(async () => {
      try {
        const latest = lastMessageAtRef.current;
        const url = latest ? `${endpoint}?after=${encodeURIComponent(latest)}` : endpoint;
        const response = await fetch(url, { headers: { "x-aranos-actor": actorType }, cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        const incoming = data.messages ?? [];
        if (incoming.length > 0) {
          lastMessageAtRef.current = incoming.at(-1).createdAt;
          appendMessages(incoming);
        }
      } catch {
        // El siguiente ciclo vuelve a intentarlo sin vaciar la conversación.
      }
    }, 2500);
    return () => window.clearInterval(timer);
  }, [actorType, appendMessages, endpoint, initialMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  useEffect(() => {
    if (role !== "OWNER" || search.trim().length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const query = new URLSearchParams({ q: search.trim(), groupId: group.id });
        const response = await fetch(`/api/grupos/buscar?${query}`, {
          headers: { "x-aranos-actor": actorType },
          cache: "no-store",
          signal: controller.signal,
        });
        const data = await response.json();
        setResults(response.ok ? data.results ?? [] : []);
        if (!response.ok) setInviteError(data.error ?? "groups.errors.searchFailed");
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setInviteError("groups.errors.network");
        }
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [actorType, group.id, role, search]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = form.elements.namedItem("content");
    if (!(input instanceof HTMLTextAreaElement)) return;
    const content = input.value;
    setSending(true);
    setMessageError(null);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "message", content }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessageError(data.error ?? "groups.errors.sendFailed");
        return;
      }
      appendMessages([data.message]);
      lastMessageAtRef.current = data.message.createdAt;
      form.reset();
    } catch {
      setMessageError("groups.errors.network");
    } finally {
      setSending(false);
    }
  }

  async function invite(result: SearchResult) {
    setInviting(result.id);
    setInviteError(null);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "invite", targetType: result.type, targetId: result.id }),
      });
      const data = await response.json();
      if (!response.ok) {
        setInviteError(data.error ?? "groups.errors.inviteFailed");
        return;
      }
      setSentIds((current) => [...current, result.id]);
      setResults((current) => current.filter((item) => item.id !== result.id));
      router.refresh();
    } catch {
      setInviteError("groups.errors.network");
    } finally {
      setInviting(null);
    }
  }

  async function updateGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingGroup(true);
    setGroupError(null);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          name: form.get("name"),
          description: form.get("description"),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setGroupError(data.error ?? "groups.errors.updateFailed");
        return;
      }
      setEditingGroup(false);
      router.refresh();
    } catch {
      setGroupError("groups.errors.network");
    } finally {
      setSavingGroup(false);
    }
  }

  async function deleteGroup() {
    if (!window.confirm(t("groups.deleteConfirm", { name: group.name }))) return;
    setDeletingGroup(true);
    setGroupError(null);
    try {
      const response = await fetch(endpoint, { method: "DELETE", headers });
      const data = await response.json();
      if (!response.ok) {
        setGroupError(data.error ?? "groups.errors.deleteFailed");
        return;
      }
      router.push(basePath);
      router.refresh();
    } catch {
      setGroupError("groups.errors.network");
    } finally {
      setDeletingGroup(false);
    }
  }

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href={basePath} className="text-[13px] font-semibold text-ink-faint underline underline-offset-2">
            {t("groups.backToGroups")}
          </Link>
          <h2 className="mt-2 font-display text-[28px] font-bold">{group.name}</h2>
          {group.description ? <p className="mt-1 max-w-3xl text-[14px] text-ink-soft">{group.description}</p> : null}
        </div>
        <span className="tag-muted">{t(role === "OWNER" ? "groups.owner" : "groups.member")}</span>
      </header>

      <GroupVoiceCall actorType={actorType} groupId={group.id} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section className="flex min-h-[480px] flex-col border-2 border-line bg-surface">
          <div className="border-b-2 border-line px-4 py-3">
            <h3 className="font-display text-[19px] font-bold">{t("groups.messages")}</h3>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite" aria-relevant="additions">
            {messages.length === 0 ? (
              <p className="py-10 text-center text-[14px] text-ink-faint">{t("groups.noMessages")}</p>
            ) : messages.map((message) => (
              <article key={message.id} className="max-w-[90%] border-2 border-line bg-paper px-3 py-2">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <strong className="text-[13px]">{message.senderName}</strong>
                  <time dateTime={message.createdAt} className="text-[11px] tabular-nums text-ink-faint">
                    {message.createdAt.slice(0, 16).replace("T", " ")}
                  </time>
                </div>
                <p className="mt-1 whitespace-pre-wrap break-words text-[14px]">{message.content}</p>
              </article>
            ))}
            <div ref={messagesEndRef} />
          </div>
          {messageError ? <p role="alert" className="px-4 pb-2 text-[13px] text-danger">{t(messageError as never)}</p> : null}
          <form onSubmit={sendMessage} className="flex flex-col gap-2 border-t-2 border-line p-3 sm:flex-row sm:items-end">
            <textarea
              name="content"
              required
              maxLength={1500}
              rows={2}
              aria-label={t("groups.messagePlaceholder")}
              placeholder={t("groups.messagePlaceholder")}
              className="input min-h-12 flex-1 resize-y"
            />
            <button type="submit" disabled={sending} className="btn-primary self-end disabled:opacity-50">
              {sending ? t("groups.sending") : t("groups.send")}
            </button>
          </form>
        </section>

        <aside className="flex flex-col gap-5">
          <section className="border-2 border-line bg-surface p-4">
            <h3 className="font-display text-[18px] font-bold">
              {t("groups.membersTitle", { count: members.length })}
            </h3>
            <ul className="mt-3 flex flex-col divide-y divide-hairline">
              {members.map((member) => (
                <li key={member.id} className="flex items-center justify-between gap-2 py-2 text-[13px]">
                  <span>{member.name}</span>
                  {member.role === "OWNER" ? <span className="tag-muted">{t("groups.owner")}</span> : null}
                </li>
              ))}
            </ul>
          </section>

          {role === "OWNER" ? (
            <section className="flex flex-col gap-3 border-2 border-line bg-paper p-4">
              <h3 className="font-display text-[18px] font-bold">{t("groups.manageGroup")}</h3>
              {groupError ? <p role="alert" className="text-[13px] text-danger">{t(groupError as never)}</p> : null}
              {editingGroup ? (
                <form onSubmit={updateGroup} className="flex flex-col gap-3">
                  <label className="flex flex-col gap-1 text-[13px] font-semibold">
                    {t("groups.name")}
                    <input name="name" className="input" minLength={2} maxLength={60} defaultValue={group.name} required />
                  </label>
                  <label className="flex flex-col gap-1 text-[13px] font-semibold">
                    {t("groups.description")}
                    <textarea name="description" className="input min-h-20 resize-y" maxLength={300} defaultValue={group.description} />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button type="submit" disabled={savingGroup} className="btn-primary btn-sm disabled:opacity-50">
                      {savingGroup ? t("groups.saving") : t("groups.saveChanges")}
                    </button>
                    <button type="button" disabled={savingGroup} onClick={() => setEditingGroup(false)} className="btn-outline btn-sm disabled:opacity-50">
                      {t("groups.cancel")}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setEditingGroup(true)} className="btn-outline btn-sm">
                    {t("groups.editGroup")}
                  </button>
                  <button type="button" disabled={deletingGroup} onClick={deleteGroup} className="btn-outline btn-sm text-danger disabled:opacity-50">
                    {deletingGroup ? t("groups.deleting") : t("groups.deleteGroup")}
                  </button>
                </div>
              )}
            </section>
          ) : null}

          {role === "OWNER" ? (
            <section className="flex flex-col gap-3 border-2 border-line bg-paper p-4">
              <div>
                <h3 className="font-display text-[18px] font-bold">{t("groups.invitePeople")}</h3>
                <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">{t("groups.searchHelp")}</p>
              </div>
              <input
                value={search}
                onChange={(event) => setSearch(event.currentTarget.value)}
                className="input"
                minLength={2}
                maxLength={80}
                placeholder={t("groups.searchPlaceholder")}
                aria-label={t("groups.searchPlaceholder")}
              />
              {searching ? <p className="text-[12px] text-ink-faint">{t("groups.searching")}</p> : null}
              {inviteError ? <p role="alert" className="text-[12px] text-danger">{t(inviteError as never)}</p> : null}
              {search.trim().length >= 2 && !searching && results.length === 0 ? (
                <p className="text-[12px] text-ink-faint">{t("groups.noSearchResults")}</p>
              ) : null}
              <ul className="flex flex-col gap-2">
                {search.trim().length >= 2 ? results.map((result) => (
                  <li key={`${result.type}-${result.id}`} className="flex items-center justify-between gap-2">
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-semibold">{result.name}</span>
                      <span className="block truncate text-[11px] text-ink-faint">{result.account}</span>
                    </span>
                    <button
                      type="button"
                      disabled={inviting === result.id || sentIds.includes(result.id)}
                      onClick={() => invite(result)}
                      className="btn-outline btn-sm shrink-0 disabled:opacity-50"
                    >
                      {sentIds.includes(result.id)
                        ? t("groups.invited")
                        : inviting === result.id
                          ? "…"
                          : t("groups.invite")}
                    </button>
                  </li>
                )) : null}
              </ul>

              {pendingInvitations.length > 0 ? (
                <div className="border-t border-line pt-3">
                  <p className="text-[12px] font-semibold">{t("groups.pendingInvitations")}</p>
                  <ul className="mt-1 space-y-1 text-[12px] text-ink-soft">
                    {pendingInvitations.map((invitation) => <li key={invitation.id}>{invitation.name}</li>)}
                  </ul>
                </div>
              ) : null}
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}