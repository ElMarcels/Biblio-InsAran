import "server-only";

import es from "./es.json";
import ca from "./ca.json";

import { DEFAULT_LOCALE, type Locale } from "../config";

/** Diccionario de un idioma: `clave -> texto`. */
export type Messages = Record<string, string>;

/**
 * Claves de traducción válidas.
 *
 * El castellano es la fuente de verdad: cualquier `t("…")` que use una clave
 * que no exista en `es.json` dará un error de compilación.
 */
export type TranslationKey = keyof typeof es;

// Comprobación en tiempo de compilación: `ca` debe cubrir exactamente
// las mismas claves que el castellano. Si falta (o sobra) una, `tsc` avisa.
const catalan: Record<TranslationKey, string> = ca;

/** Diccionarios de todos los idiomas soportados. */
export const DICTS: Record<Locale, Messages> = {
  es,
  ca: catalan,
};

/** Diccionario de respaldo (castellano). */
export const FALLBACK: Messages = es;

export { DEFAULT_LOCALE };
