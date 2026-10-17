// Nomenclatura del número de carné de la biblioteca.
//
// Todos los carnés siguen el mismo formato: una sigla del centro, un guion y
// un secuencial de cuatro dígitos (`INSARAN-0001`). Este módulo es la única
// fuente de verdad: el botón «Generar» del formulario, la validación y el
// carné imprimible lo usan para que nunca se desincronicen.

/** Sigla del centro que encabeza todos los números de carné. */
export const CARD_PREFIX = "INSARAN";

/** Formato canónico: `INSARAN-` + al menos cuatro dígitos. */
export const CARD_NUMBER_PATTERN = /^INSARAN-\d{4,}$/;

/** Convierte un secuencial en un número de carné canónico. */
export function formatCardNumber(sequence: number): string {
  const value = Math.max(1, Math.trunc(sequence));
  return `${CARD_PREFIX}-${String(value).padStart(4, "0")}`;
}

/**
 * Secuencial de un número de carné, o 0 si no sigue la nomenclatura.
 * Sirve para buscar el número más alto ya asignado.
 */
export function cardNumberSequence(value: string | null | undefined): number {
  if (!value) return 0;
  const match = /^INSARAN-(\d+)$/.exec(value.trim());
  return match ? Number.parseInt(match[1], 10) : 0;
}

/**
 * Siguiente número de carné libre a partir de los ya asignados. Si todavía no
 * hay ninguno, empieza por `INSARAN-0001`.
 */
export function nextCardNumber(
  existing: ReadonlyArray<string | null | undefined>,
): string {
  let max = 0;
  for (const value of existing) {
    max = Math.max(max, cardNumberSequence(value));
  }
  return formatCardNumber(max + 1);
}

/** ¿El valor (ya recortado) respeta la nomenclatura del centro? */
export function isValidCardNumber(value: string): boolean {
  return CARD_NUMBER_PATTERN.test(value.trim());
}
