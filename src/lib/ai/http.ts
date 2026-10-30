import "server-only";

import { NextResponse } from "next/server";

import { DEFAULT_LOCALE, isLocale } from "../i18n/config";
import { checkRateLimit } from "../rate-limit";
import { cancelAction, executeAction } from "./actions";
import { AssistantAuthError, canPersist, resolveActor } from "./auth";
import { runAssistant } from "./chat";
import { dailyMessageLimit, isAssistantEnabled } from "./config";
import { assistantError } from "./gemini";
import {
  appendMessage,
  cleanupOldConversations,
  conversationHistory,
  conversationMessages,
  countUserMessagesToday,
  createConversation,
  deleteConversation,
  getConversation,
  listConversations,
  renameConversation,
} from "./history";
import type {
  AssistantActor,
  AssistantEvent,
  AssistantScope,
} from "./types";

const MAX_MESSAGE_LENGTH = 2000;

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim().slice(0, 64);
  return request.headers.get("x-real-ip")?.slice(0, 64) ?? "unknown";
}

function actorKey(actor: AssistantActor, request: Request): string {
  if (actor.scope === "READER") return `reader:${actor.readerId}`;
  if (actor.scope === "STAFF") return `staff:${actor.userId}`;
  return `ip:${clientIp(request)}`;
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  const body = await request.json().catch(() => null);
  return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
}

export async function chatResponse(
  request: Request,
  options: { staffOnly?: boolean } = {},
): Promise<Response> {
  if (!isAssistantEnabled()) {
    return jsonError(
      "El asistente no está configurado en esta instalación (falta GEMINI_API_KEY).",
      503,
    );
  }

  const body = await readBody(request);
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) return jsonError("Escribe un mensaje.", 400);
  if (message.length > MAX_MESSAGE_LENGTH) {
    return jsonError(
      `El mensaje es demasiado largo (máximo ${MAX_MESSAGE_LENGTH} caracteres).`,
      400,
    );
  }

  const requested: AssistantScope = options.staffOnly
    ? "STAFF"
    : body.scope === "READER"
      ? "READER"
      : "PUBLIC";

  let actor: AssistantActor;
  try {
    actor = await resolveActor(requested, { staffOnly: options.staffOnly });
  } catch (error) {
    if (error instanceof AssistantAuthError) {
      return jsonError(error.message, error.status);
    }
    throw error;
  }

  const limit = checkRateLimit(`asistente:${actorKey(actor, request)}`, {
    max: actor.scope === "PUBLIC" ? 12 : 40,
    windowMs: 5 * 60 * 1000,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Demasiados mensajes seguidos. Espera un momento antes de volver a escribir.",
      },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      },
    );
  }

  if (canPersist(actor)) {
    const today = await countUserMessagesToday(actor);
    if (today >= dailyMessageLimit()) {
      return jsonError(
        "Has llegado al límite diario de mensajes del asistente. Mañana podrás seguir.",
        429,
      );
    }
  }

  const requestedConversation =
    typeof body.conversationId === "string" && body.conversationId.trim()
      ? body.conversationId.trim()
      : null;

  let conversationId: string | null = null;
  if (canPersist(actor)) {
    if (requestedConversation) {
      const existing = await getConversation(actor, requestedConversation);
      if (!existing) return jsonError("Esa conversación no existe.", 404);
      conversationId = existing.id;
    }
  }

  const locale = isLocale(body.locale) ? body.locale : DEFAULT_LOCALE;
  const history = await conversationHistory(actor, conversationId);

  if (!conversationId && canPersist(actor)) {
    conversationId = await createConversation(actor, message);
  }

  await appendMessage({
    conversationId,
    role: "user",
    content: message,
  });

  void cleanupOldConversations();

  const encoder = new TextEncoder();
  const signal = request.signal;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const send = (event: AssistantEvent) => {
        if (closed || signal.aborted) return;
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
        );
      };

      send({ type: "meta", conversationId });

      try {
        const result = await runAssistant({
          actor,
          locale,
          conversationId,
          history,
          message,
          signal,
          emit: send,
        });

        let messageId: string | null = null;
        if (result.text.trim()) {
          messageId = await appendMessage({
            conversationId,
            role: "assistant",
            content: result.text,
            books: result.books,
            actions: result.actions,
            toolCalls: result.toolNames,
            tokensIn: result.tokensIn,
            tokensOut: result.tokensOut,
          });
        }

        send({ type: "done", messageId });
      } catch (error) {
        if (!signal.aborted) {
          send({ type: "error", message: assistantError(error) });
        }
      } finally {
        closed = true;
        try {
          controller.close();
        } catch {
          // El cliente ya cerró el flujo.
        }
      }
    },
    cancel() {
      // La señal de la petición se propaga al SDK de Gemini.
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

/** Lista de conversaciones de la identidad actual. */
export async function listConversationsResponse(
  request: Request,
  options: { staffOnly?: boolean } = {},
): Promise<Response> {
  let actor: AssistantActor;
  try {
    actor = await resolveActor(options.staffOnly ? "STAFF" : "READER", {
      staffOnly: options.staffOnly,
    });
  } catch (error) {
    if (error instanceof AssistantAuthError) {
      return jsonError(error.message, error.status);
    }
    throw error;
  }
  if (!canPersist(actor)) return NextResponse.json({ ok: true, conversations: [] });
  return NextResponse.json({
    ok: true,
    conversations: await listConversations(actor),
  });
}

/** Lee, renombra o borra una conversación. */
export async function conversationResponse(
  request: Request,
  conversationId: string,
  options: { staffOnly?: boolean } = {},
): Promise<Response> {
  let actor: AssistantActor;
  try {
    actor = await resolveActor(options.staffOnly ? "STAFF" : "READER", {
      staffOnly: options.staffOnly,
    });
  } catch (error) {
    if (error instanceof AssistantAuthError) {
      return jsonError(error.message, error.status);
    }
    throw error;
  }

  if (!canPersist(actor)) return jsonError("No hay historial disponible.", 401);

  if (request.method === "GET") {
    const conversation = await conversationMessages(actor, conversationId);
    if (!conversation) return jsonError("Esa conversación no existe.", 404);
    return NextResponse.json({ ok: true, conversation });
  }

  if (request.method === "DELETE") {
    const deleted = await deleteConversation(actor, conversationId);
    if (!deleted) return jsonError("Esa conversación no existe.", 404);
    return NextResponse.json({ ok: true });
  }

  if (request.method === "PATCH") {
    const body = await readBody(request);
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) return jsonError("Escribe un título.", 400);
    const renamed = await renameConversation(actor, conversationId, title);
    if (!renamed) return jsonError("Esa conversación no existe.", 404);
    return NextResponse.json({ ok: true });
  }

  return jsonError("Método no permitido.", 405);
}

/** Confirma o cancela una acción propuesta por Aran. */
export async function actionResponse(
  request: Request,
  actionId: string,
  options: { staffOnly?: boolean } = {},
): Promise<Response> {
  let actor: AssistantActor;
  try {
    actor = await resolveActor(options.staffOnly ? "STAFF" : "READER", {
      staffOnly: options.staffOnly,
    });
  } catch (error) {
    if (error instanceof AssistantAuthError) {
      return jsonError(error.message, error.status);
    }
    throw error;
  }

  if (!canPersist(actor)) return jsonError("No hay acciones disponibles.", 401);

  const body = await readBody(request);
  const decision = body.decision === "cancel" ? "cancel" : "confirm";

  try {
    if (decision === "cancel") {
      await cancelAction({ actor, actionId });
      return NextResponse.json({ ok: true, cancelled: true });
    }
    const result = await executeAction({ actor, actionId });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "No se ha podido completar la acción.",
      400,
    );
  }
}
