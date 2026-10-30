import "server-only";

import type { FunctionDeclaration, Schema } from "@google/genai";
import { Type } from "@google/genai";
import { z } from "zod";

import { actionDefinitionsFor, proposeAction } from "../actions";
import type { AssistantActor, AssistantTool } from "../types";
import { catalogTools } from "./catalog";
import { readerTools } from "./reader";
import { staffTools } from "./staff";

/**
 * Convierte el JSON Schema que genera Zod al esquema que espera Gemini
 * (tipos en mayúsculas y campos en camelCase).
 */
function toGeminiSchema(input: unknown): Schema {
  const value = (input ?? {}) as Record<string, unknown>;
  const type =
    typeof value.type === "string"
      ? (value.type.toUpperCase() as Type)
      : undefined;

  const schema: Schema = {};
  if (type) schema.type = type;
  if (typeof value.description === "string") schema.description = value.description;
  if (typeof value.format === "string") schema.format = value.format;
  if (typeof value.pattern === "string") schema.pattern = value.pattern;
  if (typeof value.minimum === "number") schema.minimum = value.minimum;
  if (typeof value.maximum === "number") schema.maximum = value.maximum;
  if (typeof value.minLength === "number") schema.minLength = String(value.minLength);
  if (typeof value.maxLength === "number") schema.maxLength = String(value.maxLength);
  if (Array.isArray(value.enum)) {
    schema.enum = value.enum.map((item) => String(item));
    schema.format = "enum";
  }
  if (Array.isArray(value.required)) {
    schema.required = value.required.map((item) => String(item));
  }
  if (value.properties && typeof value.properties === "object") {
    schema.properties = Object.fromEntries(
      Object.entries(value.properties as Record<string, unknown>).map(
        ([key, child]) => [key, toGeminiSchema(child)],
      ),
    );
    schema.propertyOrdering = Object.keys(schema.properties);
  }
  if (value.items) schema.items = toGeminiSchema(value.items);
  if (Array.isArray(value.anyOf)) {
    schema.anyOf = value.anyOf.map((child) => toGeminiSchema(child));
  }
  return schema;
}

export function toolDeclarations(tools: AssistantTool[]): FunctionDeclaration[] {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: toGeminiSchema(z.toJSONSchema(tool.parameters)),
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
