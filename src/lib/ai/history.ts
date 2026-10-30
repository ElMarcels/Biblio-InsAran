import "server-only";

import type { Prisma } from "@prisma/client";

import { prisma } from "../prisma";
import { canPersist } from "./auth";
import { historyRetentionDays, MAX_HISTORY_MESSAGES } from "./config";
import type {
  AssistantActor,
  AssistantBook,
  AssistantMessageInput,
  ProposedActionView,
} from "./types";

function ownerWhere(actor: AssistantActor) {
  if (actor.scope === "READER") return { readerId: actor.readerId };
  if (actor.scope === "STAFF") return { userId: actor.userId };
  return null;
}

export async function createConversation(
  actor: AssistantActor,
  firstMessage: string,
): Promise<string | null> {
  if (!canPersist(actor)) return null;
  const owner = ownerWhere(actor);
  if (!owner) return null;
  const title = firstMessage.trim().slice(0, 80) || "Conversación con Aran";
  const conversation = await prisma.assistantConversation.create({
    data: {
      scope: actor.scope,
      title,
      ...owner,
    },
  });
  return conversation.id;
}

export async function getConversation(
  actor: AssistantActor,
  conversationId: string,
) {
  if (!canPersist(actor)) return null;
  const owner = ownerWhere(actor);
  if (!owner) return null;
  return prisma.assistantConversation.findFirst({
    where: { id: conversationId, ...owner },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: MAX_HISTORY_MESSAGES,
      },
    },
  });
}

export async function conversationHistory(
  actor: AssistantActor,
  conversationId: string | null,
): Promise<AssistantMessageInput[]> {
  if (!conversationId) return [];
  const conversation = await getConversation(actor, conversationId);
  if (!conversation) return [];
  return conversation.messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .reverse()
    .map((message) => {
      let content = message.content;
      // Incluir contexto de herramientas usadas para mantener la memoria multi-turno.
      const toolCalls = message.toolCalls as string[] | null;
      if (toolCalls && toolCalls.length > 0 && message.role === "assistant") {
        const tools = toolCalls.join(", ");
        content = `${content}\n\n[Herramientas consultadas: ${tools}]`;
      }
      return {
        role: message.role as "user" | "assistant",
        content,
      };
    });
}

export async function appendMessage(input: {
  conversationId: string | null;
  role: "user" | "assistant";
  content: string;
  books?: AssistantBook[];
  actions?: ProposedActionView[];
  toolCalls?: string[];
  tokensIn?: number;
  tokensOut?: number;
}): Promise<string | null> {
  if (!input.conversationId) return null;
  const attachments =
    input.books?.length || input.actions?.length
      ? { books: input.books ?? [], actions: input.actions ?? [] }
      : undefined;
  const message = await prisma.assistantMessage.create({
    data: {
      conversationId: input.conversationId,
      role: input.role,
      content: input.content,
      attachments: (attachments as Prisma.InputJsonValue | undefined) ?? undefined,
      toolCalls: input.toolCalls?.length
        ? (input.toolCalls as Prisma.InputJsonValue)
        : undefined,
      tokensIn: input.tokensIn ?? null,
      tokensOut: input.tokensOut ?? null,
    },
  });
  await prisma.assistantConversation.update({
    where: { id: input.conversationId },
    data: { updatedAt: new Date() },
  });
  return message.id;
}

/** Mensajes enviados hoy por esta identidad (para el límite diario). */
export async function countUserMessagesToday(
  actor: AssistantActor,
): Promise<number> {
  const owner = ownerWhere(actor);
  if (!owner) return 0;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return prisma.assistantMessage.count({
    where: {
      role: "user",
      createdAt: { gte: start },
      conversation: owner,
    },
  });
}

export async function listConversations(actor: AssistantActor) {
  if (!canPersist(actor)) return [];
  const owner = ownerWhere(actor);
  if (!owner) return [];
  const conversations = await prisma.assistantConversation.findMany({
    where: owner,
    orderBy: { updatedAt: "desc" },
    take: 30,
    select: {
      id: true,
      title: true,
      updatedAt: true,
      createdAt: true,
      _count: { select: { messages: true } },
    },
  });
  return conversations.map((conversation) => ({
    id: conversation.id,
    title: conversation.title ?? "Conversación",
    updatedAt: conversation.updatedAt.toISOString(),
    createdAt: conversation.createdAt.toISOString(),
    messages: conversation._count.messages,
  }));
}

export async function renameConversation(
  actor: AssistantActor,
  conversationId: string,
  title: string,
): Promise<boolean> {
  const conversation = await getConversation(actor, conversationId);
  if (!conversation) return false;
  await prisma.assistantConversation.update({
    where: { id: conversation.id },
    data: { title: title.trim().slice(0, 80) || "Conversación" },
  });
  return true;
}

export async function deleteConversation(
  actor: AssistantActor,
  conversationId: string,
): Promise<boolean> {
  const conversation = await getConversation(actor, conversationId);
  if (!conversation) return false;
  await prisma.assistantConversation.delete({ where: { id: conversation.id } });
  return true;
}

/** Borra conversaciones antiguas. Se llama de forma perezosa al abrir el chat. */
export async function cleanupOldConversations(): Promise<void> {
  const cutoff = new Date(
    Date.now() - historyRetentionDays() * 24 * 60 * 60 * 1000,
  );
  await prisma.assistantConversation
    .deleteMany({ where: { updatedAt: { lt: cutoff } } })
    .catch(() => undefined);
}

/** Marca como leído el último mensaje guardado (no se usa para nada más). */
export async function conversationMessages(
  actor: AssistantActor,
  conversationId: string,
) {
  const conversation = await getConversation(actor, conversationId);
  if (!conversation) return null;

  // Solo se devuelven las acciones que siguen pendientes y vigentes: las ya
  // ejecutadas, canceladas o caducadas no deben mostrar botones de confirmar.
  const actionIds = Array.from(
    new Set(
      conversation.messages.flatMap((message) => {
        const attachments = message.attachments as
          | { actions?: ProposedActionView[] }
          | null;
        return attachments?.actions?.map((action) => action.id) ?? [];
      }),
    ),
  ).slice(0, 100);
  const liveActions =
    actionIds.length > 0
      ? await prisma.assistantAction.findMany({
          where: {
            id: { in: actionIds },
            status: "PENDING",
            expiresAt: { gt: new Date() },
          },
          select: { id: true },
        })
      : [];
  const liveIds = new Set(liveActions.map((action) => action.id));

  return {
    id: conversation.id,
    title: conversation.title,
    scope: conversation.scope,
    updatedAt: conversation.updatedAt.toISOString(),
    messages: [...conversation.messages].reverse().map((message) => {
      const attachments = message.attachments as
        | { books?: AssistantBook[]; actions?: ProposedActionView[] }
        | null;
      return {
        id: message.id,
        role: message.role,
        content: message.content,
        createdAt: message.createdAt.toISOString(),
        books: attachments?.books ?? [],
        actions: (attachments?.actions ?? []).filter((action) =>
          liveIds.has(action.id),
        ),
      };
    }),
  };
}
