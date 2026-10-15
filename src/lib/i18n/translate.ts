import type { Messages, TranslationKey } from "./messages";

export type { Messages };

/** Valores que se sustituyen en los marcadores `{nombre}` de un mensaje. */
export type TranslateParams = Record<string, string | number>;

/**
 * Traductor: recibe una clave (una de las definidas en `es.json`) y, si el
 * mensaje lleva datos, los valores para sus marcadores `{nombre}`.
 */
export type Translator = (
  key: TranslationKey | undefined,
  params?: TranslateParams,
) => string;

/** Sustituye los marcadores `{nombre}` de un texto por sus valores. */
export function interpolate(text: string, params?: TranslateParams): string {
  if (!params) return text;
  let result = text;
  for (const [name, value] of Object.entries(params)) {
    result = result.replaceAll(`{${name}}`, String(value));
  }
  return result;
}

/**
 * Crea un traductor a partir del diccionario del idioma activo y el de
 * respaldo. Si una clave no está traducida, se usa el castellano; si tampoco
 * existe, se devuelve la propia clave (nunca se rompe).
 */
export function createTranslator(
  messages: Messages,
  fallback: Messages,
): Translator {
  return (key, params) =>
    key ? interpolate(messages[key] ?? fallback[key] ?? key, params) : "";
}

export type { TranslationKey };
