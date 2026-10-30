import "server-only";

import type { ChatCompletionTool } from "groq-sdk/resources/chat/completions";
import { z } from "zod";

import { actionDefinitionsFor, proposeAction } from "../actions";
import type { AssistantActor, AssistantTool } from "../types";
import { catalogTools } from "./catalog";
import { readerTools } from "./reader";
import { staffTools } from "./staff";

export function toolDeclarations(tools: AssistantTool[]): ChatCompletionTool[] {
  return tools.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: z.toJSONSchema(tool.parameters) as Record<string, unknown>,
    },
  }));
}

export function toolsForActor(
  actor: AssistantActor,
  conversationId: string | null,
): AssistantTool[] {
  const tools: AssistantTool[] = [...catalogTools];

  if (actor.scope === "READER") {
    tools.push(...readerTools(actor.readerId));
  }
  if (actor.scope === "STAFF") {
    tools.push(...staffTools(actor.role));
  }

  if (actor.scope !== "PUBLIC") {
    const allowedTypes = actionDefinitionsFor(actor).map((d) => d.type);
    tools.push({
      name: "proponer_accion",
      description:
        "Propone una acción que la persona debe confirmar. NUNCA ejecuta nada por sí sola. " +
        "Rellena `payload` con un objeto JSON válido con los campos que pide el tipo de acción. " +
        "Después de proponerla, explica en una frase qué va a pasar y pide confirmación.",
      parameters: z.object({
        type: z
          .enum(allowedTypes as [string, ...string[]])
          .describe(
            "Tipo de acción permitido. Debe ser EXACTAMENTE uno de los identificadores listados.",
          ),
        payload: z
          .string()
          .describe(
            "Objeto JSON con los parámetros. Ejemplo: {\"bookId\":\"abc\",\"readerId\":\"def\"}.",
          ),
      }),
      async execute(args) {
        let payload: unknown = {};
        try {
          payload =
            typeof args.payload === "string" && args.payload.trim()
              ? JSON.parse(args.payload)
              : {};
        } catch {
          return {
            result: {
              ok: false,
              error:
                "El payload no es JSON válido. Vuelve a proponer la acción con un objeto JSON.",
            },
          };
        }
        try {
          const action = await proposeAction({
            actor,
            conversationId,
            type: String(args.type ?? ""),
            payload,
          });
          return {
            result: {
              ok: true,
              actionId: action.id,
              summary: action.summary,
              risk: action.risk,
              expiresAt: action.expiresAt,
              note: "La acción NO se ha ejecutado. Espera la confirmación de la persona.",
            },
            action,
          };
        } catch (error) {
          return {
            result: {
              ok: false,
              error:
                error instanceof Error
                  ? error.message
                  : "No se ha podido proponer la acción.",
            },
          };
        }
      },
    });
  }

  return tools;
}
