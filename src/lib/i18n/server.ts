import "server-only";

import { cookies } from "next/headers";

import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from "./config";
import { DICTS, FALLBACK, type Messages } from "./messages";
import { createTranslator, type Translator } from "./translate";

export type { Messages, Translator };
export type { TranslationKey } from "./messages";

/** Idioma elegido (cookie) o castellano por defecto. */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/** Diccionario del idioma activo. */
export async function getMessages(): Promise<Messages> {
  return DICTS[await getLocale()];
}

/**
 * Idioma activo y diccionarios listos para pasárselos al `LocaleProvider` de
 * los componentes cliente.
 */
export async function getTranslations(): Promise<{
  locale: Locale;
  messages: Messages;
  fallback: Messages;
}> {
  const locale = await getLocale();
  return { locale, messages: DICTS[locale], fallback: FALLBACK };
}

/** Traductor para componentes de servidor. */
export async function getT(): Promise<Translator> {
  const locale = await getLocale();
  return createTranslator(DICTS[locale], FALLBACK);
}
