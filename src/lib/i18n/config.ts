// Idiomas de la interfaz.
//
// El castellano es el idioma de origen: su diccionario
// (`messages/es.json`) define el conjunto de claves válidas y sirve de
// respaldo cuando a otra lengua le falta una traducción.

export const LOCALES = ["es", "ca", "ar"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "es";

/** Cookie que recuerda el idioma elegido. */
export const LOCALE_COOKIE = "biblio_locale";

/** Nombre de cada idioma en su propia lengua. */
export const LOCALE_LABELS: Record<Locale, string> = {
  es: "Castellano",
  ca: "Català",
  ar: "Aranés",
};

/** Código BCP-47 para el atributo `lang` y los formatos. */
export const LOCALE_TAGS: Record<Locale, string> = {
  es: "es-ES",
  ca: "ca-ES",
  ar: "oc-ES",
};

/** Código `og:locale` de cada idioma. */
export const OG_LOCALES: Record<Locale, string> = {
  es: "es_ES",
  ca: "ca_ES",
  ar: "oc_ES",
};

export function isLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" && (LOCALES as readonly string[]).includes(value)
  );
}
