import "server-only";

import type { Content, FunctionCall, Part } from "@google/genai";

import {
  MAX_TOOL_ROUNDS,
  maxOutputTokens,
} from "./config";
import { assistantModel, getGemini } from "./gemini";
import { systemInstruction } from "./prompt";
import { toolDeclarations, toolsForActor } from "./tools/registry";
import type {
  AssistantBook,
  ProposedActionView,
  RunAssistantInput,
  RunAssistantResult,
} from "./types";

function asPart(call: FunctionCall): Part {
  return { functionCall: call };
}

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
 * Ejecuta una conversación completa con Gemini:
 * - mantiene el bucle de llamadas a herramientas (máximo 5 vueltas),
 * - emite el texto en streaming según llega,
 * - acumula tarjetas de libros y acciones para la interfaz.
 */
export async function runAssistant(
  input: RunAssistantInput,
): Promise<RunAssistantResult> {
  const { actor, locale, conversationId, history, message, emit, signal } = input;
  const ai = getGemini();
  const tools = toolsForActor(actor, conversationId);
  const declarations = toolDeclarations(tools);

  const contents: Content[] = history.map((item) => ({
    role: item.role === "assistant" ? "model" : "user",
    parts: [{ text: item.content }],
  }));
  contents.push({ role: "user", parts: [{ text: message }] });

  const books = new Map<string, AssistantBook>();
  const actions = new Map<string, ProposedActionView>();
  const toolNames: string[] = [];
  let text = "";
  let tokensIn = 0;
  let tokensOut = 0;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    // Reintento con espera exponencial si Gemini devuelve 429 (cuota agotada).
    let stream: Awaited<ReturnType<typeof ai.models.generateContentStream>> | undefined;
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        stream = await ai.models.generateContentStream({
          model: assistantModel(),
          contents,
          config: {
            systemInstruction: systemInstruction(actor, locale),
            temperature: 0.45,
            maxOutputTokens: maxOutputTokens(),
            ...(declarations.length > 0
              ? { tools: [{ functionDeclarations: declarations }] }
              : {}),
            ...(signal ? { abortSignal: signal } : {}),
          },
        });
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
    if (lastError || !stream) throw lastError ?? new Error("No se ha podido conectar con Gemini.");

    const calls: FunctionCall[] = [];
    const modelParts: Part[] = [];

    for await (const chunk of stream) {
      const chunkText = chunk.text;
      if (chunkText) {
        text += chunkText;
        emit({ type: "text", text: chunkText });
      }
      for (const part of chunk.candidates?.[0]?.content?.parts ?? []) {
        modelParts.push(part);
      }
      for (const call of chunk.functionCalls ?? []) {
        calls.push(call);
      }
      const usage = chunk.usageMetadata;
      if (usage) {
        tokensIn = usage.promptTokenCount ?? tokensIn;
        tokensOut = usage.candidatesTokenCount ?? tokensOut;
      }
    }

    if (calls.length === 0) break;

    contents.push({
      role: "model",
      parts: modelParts.length > 0 ? modelParts : calls.map(asPart),
    });

    const responses: Part[] = [];
    for (const call of calls) {
      const name = call.name ?? "";
      const tool = tools.find((candidate) => candidate.name === name);
      let output: unknown;
      if (!tool) {
        output = { error: "Herramienta no disponible." };
      } else {
        toolNames.push(name);
        try {
          const outcome = await tool.execute(call.args ?? {});
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
      responses.push({
        functionResponse: {
          name,
          ...(call.id ? { id: call.id } : {}),
          response:
            typeof output === "object" && output !== null
              ? { output }
              : { output: { value: output } },
        },
      });
    }

    contents.push({ role: "user", parts: responses });
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
