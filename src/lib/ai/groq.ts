import "server-only";

import Groq from "groq-sdk";

import { GROQ_MODEL } from "./config";

let client: Groq | null = null;

/** Cliente de Groq. La clave nunca sale del servidor. */
export function getGroq(): Groq {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("assistant-not-configured");
  }
  client ??= new Groq({ apiKey });
  return client;
}

export function assistantModel(): string {
  return GROQ_MODEL;
}

/** Mensaje legible para la interfaz a partir de un error del SDK. */
export function assistantError(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes("api key") || message.includes("permission") || message.includes("unauthorized")) {
      return "La clave de Groq no es válida o no tiene permisos.";
    }
    if (message.includes("quota") || message.includes("rate limit") || message.includes("resource exhausted") || message.includes("429")) {
      return "Aran ha alcanzado el límite de peticiones de Groq. Espera unos segundos e inténtalo de nuevo.";
    }
    if (message.includes("safety") || message.includes("blocked")) {
      return "No puedo responder a esa petición. Prueba a formularla de otra manera.";
    }
    if (message.includes("abort")) {
      return "La respuesta se ha cancelado.";
    }
  }
  const msg = error instanceof Error ? error.message : String(error);
  console.error("Error de Aran:", msg);
  return `Error: ${msg.slice(0, 300)}`;
}