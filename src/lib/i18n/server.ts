import "server-only";

import { cookies } from "next/headers";

import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from "./config";
import { DYNAMIC, MESSAGES } from "./messages";
import {
  messagesFor,
  translate,
  type DynamicMessages,
  type Messages,
  type Translator,
} from "./translate";

export type { Messages, Translator };

/** Idioma elegido (cookie) o castellano por defecto. */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/** Diccionario del idioma activo, para pasarlo a los componentes cliente. */
export async function getMessages(): Promise<Messages> {
  return messagesFor(MESSAGES, await getLocale());
}

/** Traducciones del idioma activo, para pasarlas a los componentes cliente. */
export async function getTranslations(): Promise<{
  locale: Locale;
  messages: Messages;
  dynamic: DynamicMessages;
}> {
  const locale = await getLocale();
  return {
    locale,
    messages: messagesFor(MESSAGES, locale),
    dynamic: DYNAMIC[locale] ?? [],
  };
}

/** Traductor para componentes de servidor. */
export async function getT(): Promise<Translator> {
  const { messages, dynamic } = await getTranslations();
  return (source, params) => translate(messages, source, params, dynamic);
}
