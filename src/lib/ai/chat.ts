import "server-only";

import type { ChatCompletionMessageParam, ChatCompletionTool } from "groq-sdk/resources/chat/completions";

import {
  MAX_TOOL_ROUNDS,
  maxOutputTokens,
} from "./config";
import { assistantModel, getGroq } from "./groq";
import { systemInstruction } from "./prompt";
import { toolDeclarations, toolsForActor } from "./tools/registry";
import type {
  AssistantBook,
  ProposedActionView,
  RunAssistantInput,
  RunAssistantResult,
} from "./types";

/**
 * Claves que nunca deben viajar al modelo. Las herramientas de personal
 * devuelven referencias opacas; los nombres, correos, carnés, notas y motivos
 * se quedan en el servidor y solo los pinta la interfaz autorizada.
 */
const SENSITIVE_KEYS = new Set([
  "fullName",
  "displayName",
  "username",
  "readerName",
  "userName",
  "email",
  "phone",
  "cardNumber",
  "pin",
  "pinHash",
  "password",
  "passwordHash",
  "notes",
  "reason",
  "suspensionReason",
  "summary",
]);

function sanitizeForModel(value: unknown, depth = 0): unknown {
  if (depth > 10) return null;
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForModel(item, depth + 1));
  }
  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      if (SENSITIVE_KEYS.has(key)) continue;
      output[key] = sanitizeForModel(item, depth + 1);
    }
    return output;
  }
  return value;
}

/**
 * Ejecuta una conversación completa con Groq:
 * - mantiene el bucle de llamadas a herramientas (máximo 5 vueltas),
 * - emite el texto en streaming según llega,
 * - acumula tarjetas de libros y acciones para la interfaz.
 */
export async function runAssistant(
  input: RunAssistantInput,
): Promise<RunAssistantResult> {
  const { actor, locale, conversationId, history, message, emit, signal } = input;
  const ai = getGroq();
  const tools = toolsForActor(actor, conversationId);
  const declarations = toolDeclarations(tools);

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: systemInstruction(actor, locale) },
    ...history.map((item) => ({
      role: item.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: item.content,
    })),
    { role: "user", content: message },
  ];

  const openaiTools: ChatCompletionTool[] = declarations.map((d) => {
    const fn = (d as { function: { name: string; description: string; parameters: unknown } }).function;
    return {
      type: "function" as const,
      function: {
        name: fn.name,
        description: fn.description,
        parameters: fn.parameters as Record<string, unknown>,
      },
    };
  });

  const books = new Map<string, AssistantBook>();
  const actions = new Map<string, ProposedActionView>();
  const toolNames: string[] = [];
  let text = "";
  let tokensIn = 0;
  let tokensOut = 0;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    // Reintento con espera exponencial si Groq devuelve 429.
    let completion: any;
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        completion = await ai.chat.completions.create({
          model: assistantModel(),
          messages,
          temperature: 0.45,
          max_tokens: maxOutputTokens(),
          ...(openaiTools.length > 0 ? { tools: openaiTools } : {}),
          stream: true,
        }) as any;
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
        const msg = error instanceof Error ? error.message.toLowerCase() : "";
        if (
          !msg.includes("quota") &&
          !msg.includes("rate limit") &&
          !msg.includes("429") &&
          !msg.includes("resource exhausted")
        ) {
          throw error;
        }
        if (attempt < 2) {
          const waitMs = (attempt + 1) * 2000;
          await new Promise((resolve) => setTimeout(resolve, waitMs));
        }
      }
    }
    if (lastError || !completion) {
      throw lastError ?? new Error("No se ha podido conectar con Groq.");
    }

    // Procesar el stream
    const toolCallsAccumulator: Map<number, { id: string; name: string; arguments: string }> = new Map();
    let roundText = "";

    for await (const chunk of completion) {
      const delta = chunk.choices?.[0]?.delta;
      if (!delta) continue;

      if (delta.content) {
        roundText += delta.content;
        text += delta.content;
        emit({ type: "text", text: delta.content });
      }

      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index ?? 0;
          if (!toolCallsAccumulator.has(idx)) {
            toolCallsAccumulator.set(idx, { id: tc.id ?? "", name: "", arguments: "" });
          }
          const acc = toolCallsAccumulator.get(idx)!;
          if (tc.id) acc.id = tc.id;
          if (tc.function?.name) acc.name = tc.function.name;
          if (tc.function?.arguments) acc.arguments += tc.function.arguments;
        }
      }

      const usage = chunk.usage;
      if (usage) {
        tokensIn = usage.prompt_tokens ?? tokensIn;
        tokensOut = usage.completion_tokens ?? tokensOut;
      }
    }

    const toolCalls = Array.from(toolCallsAccumulator.values()).filter((tc) => tc.name);

    if (toolCalls.length === 0) break;

    // Añadir el mensaje del asistente con las tool calls
    messages.push({
      role: "assistant",
      content: roundText || null,
      tool_calls: toolCalls.map((tc) => ({
        id: tc.id,
        type: "function" as const,
        function: { name: tc.name, arguments: tc.arguments },
      })),
    });

    // Ejecutar las herramientas
    for (const tc of toolCalls) {
      const name = tc.name;
      const tool = tools.find((candidate) => candidate.name === name);
      let output: unknown;
      if (!tool) {
        output = { error: "Herramienta no disponible." };
      } else {
        toolNames.push(name);
        try {
          const args = tc.arguments ? JSON.parse(tc.arguments) : {};
          const outcome = await tool.execute(args);
          output = sanitizeForModel(outcome.result);
          if (outcome.books) {
            const fresh: AssistantBook[] = [];
            for (const book of outcome.books) {
              if (!books.has(book.id)) {
                books.set(book.id, book);
                fresh.push(book);
              }
            }
            if (fresh.length > 0) emit({ type: "books", books: fresh });
          }
          if (outcome.action) {
            if (!actions.has(outcome.action.id)) {
              actions.set(outcome.action.id, outcome.action);
              emit({ type: "action", action: outcome.action });
            }
          }
        } catch (error) {
          output = {
            error:
              error instanceof Error
                ? error.message
                : "La herramienta ha fallado.",
          };
        }
      }
      messages.push({
        role: "tool",
        tool_call_id: tc.id,
        content: JSON.stringify(output),
      });
    }
  }

  if (!text.trim()) {
    const fallback =
      "No he podido preparar una respuesta. Prueba a reformular la pregunta.";
    text = fallback;
    emit({ type: "text", text: fallback });
  }

  return {
    text,
    books: Array.from(books.values()),
    actions: Array.from(actions.values()),
    toolNames,
    tokensIn,
    tokensOut,
  };
}