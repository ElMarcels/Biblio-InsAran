/** Tipos que viajan por la API del asistente y consume la interfaz. */

export type AssistantScope = "PUBLIC" | "READER" | "STAFF";

export type AssistantBookCard = {
  id: string;
  title: string;
  author: string;
  category: string;
  year: number | null;
  copies: number;
  available: number;
  coverUrl: string | null;
};

export type AssistantActionCard = {
  id: string;
  type: string;
  summary: string;
  risk: "medium" | "high";
  expiresAt: string;
  payload?: Record<string, unknown>;
};

export type AssistantChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  books: AssistantBookCard[];
  actions: AssistantActionCard[];
  pending?: boolean;
};

export type ConversationSummary = {
  id: string;
  title: string;
  updatedAt: string;
  createdAt: string;
  messages: number;
};
