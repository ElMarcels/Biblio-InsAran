"use client";

import { createContext, useContext, useMemo } from "react";

import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import {
  createTranslator,
  type Messages,
  type Translator,
} from "@/lib/i18n/translate";

type LocaleContextValue = {
  locale: Locale;
  t: Translator;
};

const identity: Translator = (key) => key ?? "";

const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  t: identity,
});

/**
 * Pone el idioma y su diccionario a disposición de todos los componentes
 * cliente, evitando pasar traducciones a mano por props.
 */
export function LocaleProvider({
  locale,
  messages,
  fallback,
  children,
}: {
  locale: Locale;
  messages: Messages;
  fallback: Messages;
  children: React.ReactNode;
}) {
  const value = useMemo<LocaleContextValue>(
    () => ({ locale, t: createTranslator(messages, fallback) }),
    [locale, messages, fallback],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

/** Traductor para componentes cliente. */
export function useT(): Translator {
  return useContext(LocaleContext).t;
}

/** Idioma activo. */
export function useLocale(): Locale {
  return useContext(LocaleContext).locale;
}
