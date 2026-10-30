"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import { BookCover } from "../BookCover";
import { Markdown } from "../Markdown";
import { useLocale, useT } from "../i18n/LocaleProvider";
import { LOCALE_TAGS } from "@/lib/i18n/config";
import type {
  AssistantActionCard,
  AssistantBookCard,
  AssistantChatMessage,
  AssistantScope,
  ConversationSummary,
} from "./types";

type ActionState = {
  status: "working" | "done" | "cancelled" | "error";
  message?: string;
};

type ChatEvent =
  | { type: "meta"; conversationId: string | null }
  | { type: "text"; text: string }
  | { type: "books"; books: AssistantBookCard[] }
  | { type: "action"; action: AssistantActionCard }
  | { type: "done"; messageId: string | null }
  | { type: "error"; message: string };

type SuggestionKey =
  | "assistant.suggestionStaff1"
  | "assistant.suggestionStaff2"
  | "assistant.suggestionStaff3"
  | "assistant.suggestionReader1"
  | "assistant.suggestionReader2"
  | "assistant.suggestionReader3"
  | "assistant.suggestionPublic1"
  | "assistant.suggestionPublic2"
  | "assistant.suggestionPublic3";

function suggestionsFor(scope: AssistantScope): SuggestionKey[] {
  if (scope === "STAFF") {
    return [
      "assistant.suggestionStaff1",
      "assistant.suggestionStaff2",
      "assistant.suggestionStaff3",
    ];
  }
  if (scope === "READER") {
    return [
      "assistant.suggestionReader1",
      "assistant.suggestionReader2",
      "assistant.suggestionReader3",
    ];
  }
  return [
    "assistant.suggestionPublic1",
    "assistant.suggestionPublic2",
    "assistant.suggestionPublic3",
  ];
}

function mergeBooks(
  current: AssistantBookCard[],
  incoming: AssistantBookCard[],
): AssistantBookCard[] {
  const seen = new Set(current.map((book) => book.id));
  return [...current, ...incoming.filter((book) => !seen.has(book.id))];
}

function mergeActions(
  current: AssistantActionCard[],
  incoming: AssistantActionCard[],
): AssistantActionCard[] {
  const seen = new Set(current.map((action) => action.id));
  return [...current, ...incoming.filter((action) => !seen.has(action.id))];
}

function MiniBook({ book }: { book: AssistantBookCard }) {
  const t = useT();
  const gone = book.available <= 0;
  return (
    <Link
      href={`/libro/${book.id}`}
      className="group flex items-stretch gap-3 border-2 border-line bg-surface p-2 transition-[transform,box-shadow] duration-150 hover:-translate-y-[2px] hover:shadow-[4px_4px_0_0_var(--color-line)]"
    >
      <div className="w-12 shrink-0">
        <BookCover
          title={book.title}
          author={book.author}
          category={book.category}
          src={book.coverUrl}
          size="sm"
          className="!p-1.5"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 py-0.5">
        <p className="line-clamp-2 font-display text-[13px] font-semibold leading-tight group-hover:text-accent">
          {book.title}
        </p>
        <p className="truncate text-[12px] text-ink-soft">{book.author}</p>
        <p
          className={`text-[11px] tabular-nums ${gone ? "font-semibold text-danger" : "text-ink-faint"}`}
        >
          {gone
            ? t("book.sinEjemplares")
            : t("book.availableDeCopiesDisp", {
                available: book.available,
                copies: book.copies,
              })}
        </p>
      </div>
    </Link>
  );
}

function ActionCard({
  action,
  state,
  onDecision,
}: {
  action: AssistantActionCard;
  state?: ActionState;
  onDecision: (action: AssistantActionCard, decision: "confirm" | "cancel") => void;
}) {
  const t = useT();
  const locale = useLocale();
  const busy = state?.status === "working";
  const resolved = state && state.status !== "working";
  const expires = new Date(action.expiresAt);
  const expiry = Number.isNaN(expires.getTime())
    ? ""
    : new Intl.DateTimeFormat(LOCALE_TAGS[locale], {
        hour: "2-digit",
        minute: "2-digit",
      }).format(expires);

  return (
    <div
      className={`mt-3 border-2 p-3 ${
        action.risk === "high"
          ? "border-danger bg-danger-soft"
          : "border-warn bg-warn-soft"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`tag ${action.risk === "high" ? "border-danger text-danger" : "border-warn text-warn"}`}
        >
          {action.risk === "high"
            ? t("assistant.riskHigh")
            : t("assistant.riskMedium")}
        </span>
        {expiry ? (
          <span className="text-[11px] text-ink-faint">
            {t("assistant.actionExpires", { time: expiry })}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-[13px] font-semibold leading-snug text-ink">
        {action.summary}
      </p>
      <p className="mt-1 text-[12px] text-ink-soft">
        {t("assistant.actionNeedsConfirm")}
      </p>

      {resolved ? (
        <p
          className={`mt-2 text-[12px] font-semibold ${
            state.status === "error" ? "text-danger" : "text-ok"
          }`}
        >
          {state.status === "cancelled"
            ? t("assistant.actionCancelled")
            : state.message ?? t("assistant.actionDone")}
        </p>
      ) : (
        <div className="mt-2.5 flex flex-wrap gap-2">
          <button
            type="button"
            className={`btn-sm ${action.risk === "high" ? "btn-danger" : "btn-primary"}`}
            disabled={busy}
            onClick={() => onDecision(action, "confirm")}
          >
            {t("assistant.confirm")}
          </button>
          <button
            type="button"
            className="btn-ghost btn-sm"
            disabled={busy}
            onClick={() => onDecision(action, "cancel")}
          >
            {t("assistant.cancel")}
          </button>
        </div>
      )}
    </div>
  );
}

export function AssistantChat({
  scope,
  variant = "panel",
  onClose,
  contextSuggestions,
}: {
  scope: AssistantScope;
  variant?: "panel" | "page";
  onClose?: () => void;
  /** Sugerencias contextuales según la página actual. */
  contextSuggestions?: string[];
}) {
  const t = useT();
  const locale = useLocale();
  const canPersist = scope !== "PUBLIC";
  const base = scope === "STAFF" ? "/api/panel/asistente" : "/api/asistente";

  const [messages, setMessages] = useState<AssistantChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [actionStates, setActionStates] = useState<Record<string, ActionState>>({});
  const [alerts, setAlerts] = useState<{ type: string; message: string; icon: string }[]>([]);
  const [alertsLoaded, setAlertsLoaded] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [quickReplies, setQuickReplies] = useState<string[]>([]);

  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const suggestions = useMemo(() => {
    if (contextSuggestions && contextSuggestions.length > 0) {
      return contextSuggestions as SuggestionKey[];
    }
    return suggestionsFor(scope);
  }, [contextSuggestions, scope]);
  const tagline =
    scope === "STAFF"
      ? t("assistant.taglineStaff")
      : scope === "READER"
        ? t("assistant.taglineReader")
        : t("assistant.taglinePublic");
  const welcome =
    scope === "STAFF"
      ? t("assistant.welcomeStaff")
      : scope === "READER"
        ? t("assistant.welcomeReader")
        : t("assistant.welcomePublic");

  const loadConversations = useCallback(async () => {
    if (!canPersist) return;
    try {
      const response = await fetch(`${base}/conversaciones`, {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) return;
      const data = (await response.json()) as {
        conversations?: ConversationSummary[];
      };
      setConversations(data.conversations ?? []);
    } catch {
      // El historial es secundario: si falla, el chat sigue funcionando.
    } finally {
      setHistoryLoading(false);
    }
  }, [base, canPersist]);

  // Cargar alertas proactivas al montar
  useEffect(() => {
    if (alertsLoaded) return;
    const loadAlerts = async () => {
      try {
        const response = await fetch(`${base}/alertas`, {
          headers: { Accept: "application/json" },
        });
        if (!response.ok) return;
        const data = (await response.json()) as { alerts?: { type: string; message: string; icon: string }[] };
        setAlerts(data.alerts ?? []);
      } catch {
        // Las alertas son secundarias
      } finally {
        setAlertsLoaded(true);
      }
    };
    void loadAlerts();
  }, [base, alertsLoaded]);

  // Generar quick replies basados en el último mensaje del asistente
  useEffect(() => {
    const timer = setTimeout(() => {
      const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant" && m.content);
      if (!lastAssistant || busy) {
        setQuickReplies([]);
        return;
      }
      const content = lastAssistant.content.toLowerCase();
      const replies: string[] = [];
      if (content.includes("libro") || content.includes("catálogo") || content.includes("disponible")) {
        replies.push("Más detalles de este libro");
        replies.push("Libros similares");
      }
      if (content.includes("préstamo") || content.includes("vence") || content.includes("renovar")) {
        replies.push("¿Puedo prorrogar?");
        replies.push("Ver mis préstamos");
      }
      if (content.includes("reserva")) {
        replies.push("¿Cómo cancelo una reserva?");
        replies.push("Ver mis reservas");
      }
      if (replies.length === 0 && lastAssistant.books.length > 0) {
        replies.push("Más detalles");
        replies.push("Libros similares");
      }
      setQuickReplies(replies.slice(0, 3));
    }, 0);
    return () => clearTimeout(timer);
  }, [messages, busy]);

  useEffect(() => {
    const element = scrollRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const handleEvent = useCallback(
    (event: ChatEvent, assistantId: string) => {
      if (event.type === "meta") {
        if (event.conversationId) setConversationId(event.conversationId);
        return;
      }
      if (event.type === "text") {
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantId
              ? { ...message, content: message.content + event.text }
              : message,
          ),
        );
        return;
      }
      if (event.type === "books") {
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantId
              ? { ...message, books: mergeBooks(message.books, event.books) }
              : message,
          ),
        );
        return;
      }
      if (event.type === "action") {
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantId
              ? {
                  ...message,
                  actions: mergeActions(message.actions, [event.action]),
                }
              : message,
          ),
        );
        return;
      }
      if (event.type === "done") {
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantId
              ? {
                  ...message,
                  id: event.messageId ?? message.id,
                  pending: false,
                }
              : message,
          ),
        );
        void loadConversations();
        return;
      }
      if (event.type === "error") {
        setError(event.message);
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantId
              ? { ...message, pending: false }
              : message,
          ),
        );
      }
    },
    [loadConversations],
  );

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || busy) return;

      setInput("");
      setError(null);
      setBusy(true);

      const assistantId = `stream-${Date.now()}`;
      const userMessage: AssistantChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: text,
        books: [],
        actions: [],
      };
      const assistantMessage: AssistantChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        books: [],
        actions: [],
        pending: true,
      };
      setMessages((current) => [...current, userMessage, assistantMessage]);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch(base, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            conversationId,
            locale,
            scope,
          }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          const data = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(data?.error ?? t("assistant.errorGeneric"));
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const chunks = buffer.split("\n\n");
          buffer = chunks.pop() ?? "";
          for (const chunk of chunks) {
            const line = chunk
              .split("\n")
              .find((candidate) => candidate.startsWith("data: "));
            if (!line) continue;
            try {
              handleEvent(JSON.parse(line.slice(6)) as ChatEvent, assistantId);
            } catch {
              // Un fragmento incompleto se descarta.
            }
          }
        }
      } catch (caught) {
        if ((caught as Error).name !== "AbortError") {
          setError(
            caught instanceof Error && caught.message
              ? caught.message
              : t("assistant.errorGeneric"),
          );
        }
      } finally {
        setBusy(false);
        abortRef.current = null;
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantId || message.pending
              ? { ...message, pending: false }
              : message,
          ),
        );
      }
    },
    [base, busy, conversationId, handleEvent, locale, scope, t],
  );

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void send(input);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void send(input);
    }
  };

  const stop = () => {
    abortRef.current?.abort();
    setBusy(false);
  };

  // Búsqueda por voz (Web Speech API)
  const startVoice = () => {
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: new () => unknown; webkitSpeechRecognition?: new () => unknown })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => unknown }).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError(t("assistant.voiceNotSupported"));
      return;
    }
    const recognition = new (SpeechRecognition as new () => {
      lang: string;
      interimResults: boolean;
      maxAlternatives: number;
      start: () => void;
      stop: () => void;
      onresult: ((event: { results: { [key: number]: { [key: number]: { transcript: string } } } }) => void) | null;
      onerror: ((event: { error: string }) => void) | null;
      onend: (() => void) | null;
    })();
    recognition.lang = locale === "ca" ? "ca-ES" : "es-ES";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    setIsListening(true);
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) {
        setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
      }
    };
    recognition.onerror = (event) => {
      if (event.error !== "aborted") {
        setError(t("assistant.voiceError"));
      }
      setIsListening(false);
    };
    recognition.onend = () => {
      setIsListening(false);
    };
    recognition.start();
  };

  const newChat = () => {
    abortRef.current?.abort();
    setBusy(false);
    setMessages([]);
    setConversationId(null);
    setError(null);
    setActionStates({});
    setHistoryOpen(false);
    textareaRef.current?.focus();
  };

  const openConversation = async (id: string) => {
    abortRef.current?.abort();
    setBusy(false);
    setError(null);
    setHistoryOpen(false);
    try {
      const response = await fetch(`${base}/conversaciones/${id}`, {
        headers: { Accept: "application/json" },
      });
      const data = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        conversation?: {
          id: string;
          messages: Array<{
            id: string;
            role: string;
            content: string;
            books?: AssistantBookCard[];
            actions?: AssistantActionCard[];
          }>;
        };
      } | null;
      if (!response.ok || !data?.conversation) {
        setError(data?.error ?? t("assistant.errorGeneric"));
        return;
      }
      setConversationId(data.conversation.id);
      setActionStates({});
      setMessages(
        data.conversation.messages.map((message) => ({
          id: message.id,
          role: message.role === "user" ? "user" : "assistant",
          content: message.content,
          books: message.books ?? [],
          actions: message.actions ?? [],
        })),
      );
    } catch {
      setError(t("assistant.errorGeneric"));
    }
  };

  const removeConversation = async (id: string) => {
    try {
      const response = await fetch(`${base}/conversaciones/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) return;
      setConversations((current) =>
        current.filter((conversation) => conversation.id !== id),
      );
      if (id === conversationId) newChat();
    } catch {
      // Sin cambios si la red falla.
    }
  };

  const decideAction = async (
    action: AssistantActionCard,
    decision: "confirm" | "cancel",
  ) => {
    setActionStates((current) => ({
      ...current,
      [action.id]: { status: "working" },
    }));
    try {
      const response = await fetch(`${base}/acciones/${action.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const data = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        message?: string;
      } | null;
      if (!response.ok || !data?.ok) {
        setActionStates((current) => ({
          ...current,
          [action.id]: {
            status: "error",
            message: data?.error ?? t("assistant.errorGeneric"),
          },
        }));
        return;
      }
      setActionStates((current) => ({
        ...current,
        [action.id]: {
          status: decision === "cancel" ? "cancelled" : "done",
          message: data?.message,
        },
      }));
    } catch {
      setActionStates((current) => ({
        ...current,
        [action.id]: { status: "error", message: t("assistant.errorGeneric") },
      }));
    }
  };

  return (
    <div
      className={`flex min-h-0 flex-col overflow-hidden border-2 border-line bg-paper ${
        variant === "page"
          ? "h-[min(720px,calc(100dvh-13rem))] min-h-[480px]"
          : "h-full"
      }`}
    >
      <header className="flex items-center gap-3 border-b-2 border-line bg-surface px-4 py-3">
        <span className="aran-orb aran-orb--mini" aria-hidden="true">
          <span className="aran-orb__core" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-[16px] font-bold leading-tight">
            {t("assistant.name")}
          </p>
          <p className="truncate text-[11px] text-ink-faint">{tagline}</p>
          {scope === "PUBLIC" ? (
            <span className="mt-0.5 inline-block border border-line bg-paper px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-ink-faint">
              {t("assistant.readOnlyMode")}
            </span>
          ) : null}
        </div>
        {canPersist ? (
          <button
            type="button"
            className="btn-ghost btn-sm !px-2"
            aria-label={t("assistant.history")}
            title={t("assistant.history")}
            onClick={() => {
              setHistoryOpen((open) => !open);
              if (!historyOpen) {
                setHistoryLoading(true);
                void loadConversations();
              }
            }}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M3 12a9 9 0 1 0 3-6.7" />
              <path d="M3 4v5h5" />
              <path d="M12 7v5l3 2" />
            </svg>
          </button>
        ) : null}
        <button
          type="button"
          className="btn-ghost btn-sm !px-2"
          aria-label={t("assistant.newChat")}
          title={t("assistant.newChat")}
          onClick={newChat}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
        {onClose ? (
          <button
            type="button"
            className="btn-ghost btn-sm !px-2"
            aria-label={t("assistant.close")}
            title={t("assistant.close")}
            onClick={onClose}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        ) : null}
      </header>

      {/* Alertas proactivas */}
      {alerts.length > 0 && messages.length === 0 ? (
        <div className="border-b border-hairline bg-accent-soft px-4 py-2.5">
          <p className="micro mb-1.5">{t("assistant.alertsTitle")}</p>
          <ul className="flex flex-col gap-1">
            {alerts.map((alert, i) => (
              <li key={i} className="flex items-center gap-2 text-[12px] text-ink-soft">
                <span aria-hidden="true">{alert.icon}</span>
                <span>{alert.message}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="relative min-h-0 flex-1">
        {historyOpen ? (
          <div className="absolute inset-0 z-20 flex flex-col bg-paper/98 backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-hairline px-4 py-2.5">
              <p className="micro">{t("assistant.history")}</p>
              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={() => setHistoryOpen(false)}
              >
                {t("assistant.close")}
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {historyLoading ? (
                <p className="p-3 text-[13px] text-ink-faint">
                  {t("assistant.historyLoading")}
                </p>
              ) : conversations.length === 0 ? (
                <p className="p-3 text-[13px] text-ink-faint">
                  {t("assistant.historyEmpty")}
                </p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {conversations.map((conversation) => (
                    <li key={conversation.id} className="flex items-stretch gap-1">
                      <button
                        type="button"
                        className={`flex min-w-0 flex-1 flex-col items-start gap-0.5 border-2 px-3 py-2 text-left transition-colors ${
                          conversation.id === conversationId
                            ? "border-line bg-surface"
                            : "border-transparent hover:border-hairline hover:bg-surface"
                        }`}
                        onClick={() => void openConversation(conversation.id)}
                      >
                        <span className="line-clamp-1 text-[13px] font-semibold">
                          {conversation.title || t("assistant.untitled")}
                        </span>
                        <span className="text-[11px] text-ink-faint">
                          {new Intl.DateTimeFormat(LOCALE_TAGS[locale], {
                            day: "2-digit",
                            month: "short",
                          }).format(new Date(conversation.updatedAt))}
                          {" · "}
                          {t("assistant.messageCount", {
                            count: conversation.messages,
                          })}
                        </span>
                      </button>
                      <button
                        type="button"
                        className="btn-ghost btn-sm !px-2 text-danger"
                        aria-label={t("assistant.deleteConversation")}
                        title={t("assistant.deleteConversation")}
                        onClick={() => void removeConversation(conversation.id)}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          aria-hidden="true"
                        >
                          <path d="M4 7h16M9 7V5h6v2M7 7l1 13h8l1-13" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}

        <div
          ref={scrollRef}
          className="h-full overflow-y-auto px-4 py-4"
          aria-live="polite"
          aria-busy={busy}
        >
          {messages.length === 0 ? (
            <div className="flex h-full flex-col justify-center gap-4">
              <div>
                <p className="micro mb-1.5">{t("assistant.name")}</p>
                <h2 className="font-display text-[22px] font-bold leading-tight">
                  {t("assistant.welcomeTitle")}
                </h2>
                <p className="mt-2 max-w-[36ch] text-[14px] leading-relaxed text-ink-soft">
                  {welcome}
                </p>
              </div>
              <div className="flex flex-col items-start gap-2">
                {suggestions.map((key) => (
                  <button
                    key={key}
                    type="button"
                    className="border-2 border-line bg-surface px-3 py-2 text-left text-[13px] font-medium transition-[transform,box-shadow] hover:-translate-y-[2px] hover:shadow-[4px_4px_0_0_var(--color-line)]"
                    onClick={() => void send(t(key))}
                  >
                    {t(key)}
                  </button>
                ))}
              </div>
              {!canPersist ? (
                <p className="text-[12px] text-ink-faint">
                  {t("assistant.visitorNoHistory")}
                </p>
              ) : null}
            </div>
          ) : (
            <ol className="flex flex-col gap-4">
              {messages.map((message) => (
                <li key={message.id} className="flex flex-col">
                  {message.role === "user" ? (
                    <div className="ml-auto max-w-[88%] border-2 border-line bg-ink px-3 py-2 text-[14px] leading-relaxed text-paper">
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                  ) : (
                    <div className="max-w-full">
                      <p className="micro mb-1">{t("assistant.name")}</p>
                      {message.content ? (
                        <div className="assistant-markdown">
                          <Markdown>{message.content}</Markdown>
                        </div>
                      ) : null}
                      {message.pending && !message.content ? (
                        <p className="flex items-center gap-2 text-[13px] text-ink-faint">
                          <span className="assistant-dots" aria-hidden="true">
                            <span />
                            <span />
                            <span />
                          </span>
                          {t("assistant.thinking")}
                        </p>
                      ) : null}
                      {message.books.length > 0 ? (
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {message.books.map((book) => (
                            <MiniBook key={book.id} book={book} />
                          ))}
                        </div>
                      ) : null}
                      {message.actions.map((action) => (
                        <ActionCard
                          key={action.id}
                          action={action}
                          state={actionStates[action.id]}
                          onDecision={(item, decision) =>
                            void decideAction(item, decision)
                          }
                        />
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {error ? (
        <div className="border-t-2 border-danger bg-danger-soft px-4 py-2 text-[12px] font-medium text-danger">
          {error}
        </div>
      ) : null}

      {/* Respuestas rápidas */}
      {quickReplies.length > 0 && !busy ? (
        <div className="flex flex-wrap gap-1.5 border-t border-hairline bg-paper px-3 py-2">
          {quickReplies.map((reply) => (
            <button
              key={reply}
              type="button"
              className="border border-line bg-surface px-2.5 py-1 text-[11px] font-medium text-ink-soft transition-colors hover:border-accent hover:text-accent"
              onClick={() => void send(reply)}
            >
              {reply}
            </button>
          ))}
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="border-t-2 border-line bg-surface p-3"
      >
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            maxLength={2000}
            placeholder={t("assistant.placeholder")}
            aria-label={t("assistant.placeholder")}
            className="input max-h-32 min-h-[44px] flex-1 resize-none !py-2.5 text-[14px]"
          />
          {/* Búsqueda por voz */}
          <button
            type="button"
            className={`btn-ghost btn-sm h-[44px] shrink-0 ${isListening ? "text-danger" : ""}`}
            aria-label={t("assistant.voiceSearch")}
            title={t("assistant.voiceSearch")}
            onClick={startVoice}
            disabled={isListening}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              {isListening ? (
                <circle cx="12" cy="12" r="4" fill="currentColor" />
              ) : (
                <>
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </>
              )}
            </svg>
          </button>
          {busy ? (
            <button
              type="button"
              className="btn-outline btn-sm h-[44px] shrink-0"
              onClick={stop}
            >
              {t("assistant.stop")}
            </button>
          ) : (
            <button
              type="submit"
              className="btn-accent btn-sm h-[44px] shrink-0"
              disabled={!input.trim()}
            >
              {t("assistant.send")}
            </button>
          )}
        </div>
        <p className="mt-2 text-[11px] leading-snug text-ink-faint">
          {t("assistant.disclaimer")}
        </p>
      </form>
    </div>
  );
}
