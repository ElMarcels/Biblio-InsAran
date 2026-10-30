import "server-only";

/** Nombre visible del asistente. */
export const ASSISTANT_NAME = "Aran";

/** Modelo de Groq. Se puede cambiar sin tocar código con `GROQ_MODEL`. */
export const GROQ_MODEL = process.env.GROQ_MODEL?.trim() || "openai/gpt-oss-120b";

/** ¿Está el asistente disponible en esta instalación? */
export function isAssistantEnabled(): boolean {
  if (process.env.ASSISTANT_ENABLED === "false") return false;
  return Boolean(process.env.GROQ_API_KEY?.trim());
}

export function maxOutputTokens(): number {
  const value = Number.parseInt(
    process.env.ASSISTANT_MAX_OUTPUT_TOKENS ?? "",
    10,
  );
  return Number.isFinite(value) && value >= 256 && value <= 8192
    ? value
    : 2048;
}

/** Mensajes que una misma identidad puede enviar al día. */
export function dailyMessageLimit(): number {
  const value = Number.parseInt(process.env.ASSISTANT_DAILY_LIMIT ?? "", 10);
  return Number.isFinite(value) && value > 0 ? value : 300;
}

/** Días que se conserva el historial antes de la limpieza automática. */
export function historyRetentionDays(): number {
  const value = Number.parseInt(process.env.ASSISTANT_HISTORY_DAYS ?? "", 10);
  return Number.isFinite(value) && value > 0 ? value : 90;
}

/** Máximo de mensajes de historial que se envían al modelo. */
export const MAX_HISTORY_MESSAGES = 20;

/** Máximo de vueltas de herramientas por respuesta. */
export const MAX_TOOL_ROUNDS = 5;

/** Minutos que una acción pendiente sigue siendo válida. */
export const ACTION_TTL_MINUTES = 5;
