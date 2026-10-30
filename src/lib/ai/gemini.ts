import "server-only";

import { GoogleGenAI } from "@google/genai";

import { GEMINI_MODEL } from "./config";

let client: GoogleGenAI | null = null;

/** Cliente de Gemini. La clave nunca sale del servidor. */
export function getGemini(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("assistant-not-configured");
  }
  client ??= new GoogleGenAI({ apiKey });
  return client;
}

export function assistantModel(): string {
  return GEMINI_MODEL;
}

/** Mensaje legible para la interfaz a partir de un error del SDK. */
export function assistantError(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes("api key") || message.includes("permission")) {
      return "La clave de Gemini no es válida o no tiene permisos.";
    }
    if (message.includes("quota") || message.includes("rate limit") || message.includes("resource exhausted")) {
      return "Aran ha alcanzado el límite de peticiones de Gemini. Espera unos segundos e inténtalo de nuevo. Si el problema persiste, la clave puede estar en el nivel gratuito con límites muy bajos.";
    }
    if (message.includes("safety") || message.includes("blocked")) {
      return "No puedo responder a esa petición. Prueba a formularla de otra manera.";
    }
    if (message.includes("abort")) {
      return "La respuesta se ha cancelado.";
    }
  }
  console.error("Error de Aran:", error);
  return "Aran no ha podido responder. Inténtalo de nuevo en un momento.";
}
