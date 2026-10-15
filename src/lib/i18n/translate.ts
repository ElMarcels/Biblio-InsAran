// Traducción de la interfaz.
//
// La aplicación está únicamente en castellano: los textos se escriben
// directamente en el código. Este módulo se conserva para no tocar las
// llamadas `t("…")` de toda la interfaz y para rellenar los marcadores
// `{nombre}` de los mensajes con datos variables (títulos, plazos, nombres…).

export type Translator = (
  source: string,
  params?: Record<string, string | number>,
) => string;

/** Devuelve el texto de origen sustituyendo los marcadores por sus valores. */
export function translate(
  source: string,
  params?: Record<string, string | number>,
): string {
  let text = source;
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      text = text.replaceAll(`{${key}}`, String(value));
    }
  }
  return text;
}
