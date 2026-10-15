"use client";

import { translate, type Translator } from "@/lib/i18n/translate";

/**
 * Traductor para componentes cliente. La interfaz es solo en castellano, así
 * que `t` se limita a rellenar los marcadores `{nombre}` de cada mensaje.
 */
export function useT(): Translator {
  return translate;
}
