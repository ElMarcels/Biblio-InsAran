import "server-only";

import type { Role } from "@prisma/client";
import type { z } from "zod";

import type { Locale } from "../i18n/config";

/** Ámbito efectivo del asistente. Se decide siempre en el servidor. */
export type AssistantScope = "PUBLIC" | "READER" | "STAFF";

/** Identidad con la que habla Aran. Nunca se confía en el cliente. */
export type AssistantActor =
  | { scope: "PUBLIC" }
  | {
      scope: "READER";
      readerId: string;
      readerName: string;
    }
  | {
      scope: "STAFF";
      userId: string;
      userName: string;
      role: Role;
    };

/** Datos mínimos de un libro para pintar una tarjeta en el chat. */
export type AssistantBook = {
  id: string;
  title: string;
  author: string;
  category: string;
  year: number | null;
  copies: number;
  available: number;
  coverUrl: string | null;
};

/** Acción pendiente que la interfaz muestra para confirmar. */
export type ProposedActionView = {
  id: string;
  type: string;
  summary: string;
  risk: "medium" | "high";
  expiresAt: string;
  payload?: Record<string, unknown>;
};

export type ToolOutcome = {
  /** Datos que recibe el modelo (JSON serializable, sin datos personales). */
  result: unknown;
  /** Tarjetas de libros que se envían a la interfaz. */
  books?: AssistantBook[];
  /** Acción propuesta que se muestra para confirmar. */
  action?: ProposedActionView;
};

export type AssistantTool = {
  name: string;
  description: string;
  parameters: z.ZodTypeAny;
  execute: (args: Record<string, unknown>) => Promise<ToolOutcome>;
};

export type AssistantEvent =
  | { type: "meta"; conversationId: string | null }
  | { type: "text"; text: string }
  | { type: "books"; books: AssistantBook[] }
  | { type: "action"; action: ProposedActionView }
  | { type: "done"; messageId: string | null }
  | { type: "error"; message: string };

export type AssistantMessageInput = {
  role: "user" | "assistant";
  content: string;
};

export type RunAssistantInput = {
  actor: AssistantActor;
  locale: Locale;
  conversationId: string | null;
  history: AssistantMessageInput[];
  message: string;
  pagePath?: string;
  signal?: AbortSignal;
  emit: (event: AssistantEvent) => void;
};

export type RunAssistantResult = {
  text: string;
  books: AssistantBook[];
  actions: ProposedActionView[];
  toolNames: string[];
  tokensIn: number;
  tokensOut: number;
};
