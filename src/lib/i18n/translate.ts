import { DEFAULT_LOCALE, type Locale } from "./config";

export type Messages = Record<string, string>;

export type Translator = (
  source: string,
  params?: Record<string, string | number>,
) => string;

/** Plantilla de un mensaje con datos variables. */
export type DynamicEntry = {
  /** Texto en castellano con marcadores `{nombre}`. */
  source: string;
  /** Traducción con los mismos marcadores. */
  target: string;
};

/** Mensajes con datos variables (nombres, títulos, plazos…). */
export type DynamicMessages = ReadonlyArray<DynamicEntry>;

type CompiledEntry = { pattern: RegExp; target: string };

const PLACEHOLDER = /\{(\w+)\}/g;

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Compila una plantilla del tipo «Cuenta «{user}» creada.» a una expresión
 * regular. Así los avisos que llevan datos interpolados (un título, un
 * nombre…) también se pueden traducir aunque su texto exacto varíe.
 */
function compile(dynamic: DynamicMessages): CompiledEntry[] {
  return dynamic.map(({ source, target }) => {
    let pattern = "";
    let last = 0;
    for (const match of source.matchAll(PLACEHOLDER)) {
      const index = match.index ?? 0;
      pattern += escapeRegex(source.slice(last, index));
      pattern += "(.+?)";
      last = index + match[0].length;
    }
    pattern += escapeRegex(source.slice(last));
    return { pattern: new RegExp(`^${pattern}$`), target };
  });
}

const compiledCache = new WeakMap<DynamicMessages, CompiledEntry[]>();

function compiledDynamic(dynamic: DynamicMessages): CompiledEntry[] {
  const cached = compiledCache.get(dynamic);
  if (cached) return cached;
  const result = compile(dynamic);
  compiledCache.set(dynamic, result);
  return result;
}

/** Rellena los marcadores con los valores capturados del mensaje original. */
function fillPlaceholders(
  template: string,
  values: string[],
  messages: Messages,
): string {
  let index = 0;
  return template.replace(PLACEHOLDER, () => {
    const value = values[index++] ?? "";
    // Los valores que coinciden con una clave conocida (etiquetas de campo,
    // por ejemplo) también se traducen; los datos de la base de datos no.
    return messages[value] ?? value;
  });
}

function matchDynamic(
  dynamic: DynamicMessages,
  source: string,
  messages: Messages,
): string | undefined {
  for (const entry of compiledDynamic(dynamic)) {
    const match = entry.pattern.exec(source);
    if (match) {
      return fillPlaceholders(entry.target, Array.from(match.slice(1)), messages);
    }
  }
  return undefined;
}

/**
 * Traduce un texto escrito en castellano.
 * - Si falta la traducción, devuelve el texto original.
 * - Sustituye los marcadores `{nombre}` por los valores recibidos.
 * - Reconoce los mensajes con datos variables (`dynamic`) por su forma.
 */
export function translate(
  messages: Messages,
  source: string,
  params?: Record<string, string | number>,
  dynamic?: DynamicMessages,
): string {
  let text: string | undefined = messages[source];
  if (text === undefined && dynamic && dynamic.length > 0) {
    text = matchDynamic(dynamic, source, messages);
  }
  if (text === undefined) text = source;
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      text = text.replaceAll(`{${key}}`, String(value));
    }
  }
  return text;
}

/**
 * Diccionario de un idioma dentro de un conjunto de diccionarios.
 * El castellano es el idioma de origen: no necesita traducción.
 */
export function messagesFor(
  dictionaries: Record<Locale, Messages>,
  locale: Locale | string,
): Messages {
  if (locale === DEFAULT_LOCALE) return {};
  return dictionaries[locale as Locale] ?? {};
}
