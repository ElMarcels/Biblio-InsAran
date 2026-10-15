// Etiquetas legibles para los valores que se guardan en la base de datos.

import type { TranslationKey } from "./i18n/translate";

/** Clave de traducción del estado de una reserva (para la interfaz). */
export function reservationStatusKey(status: string): TranslationKey | undefined {
  switch (status) {
    case "ACTIVE":
      return "status.pendiente";
    case "FULFILLED":
      return "status.servida";
    case "CANCELLED":
      return "status.anulada";
    default:
      return undefined;
  }
}

/** Etiqueta en castellano, sin traducir (para la exportación CSV). */
export function reservationStatusLabel(status: string): string {
  switch (status) {
    case "ACTIVE":
      return "Pendiente";
    case "FULFILLED":
      return "Servida";
    case "CANCELLED":
      return "Anulada";
    default:
      return status;
  }
}
