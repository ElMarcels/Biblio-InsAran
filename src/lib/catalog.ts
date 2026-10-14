// Catálogo de categorías disponibles en el sistema.
// Se usan tanto en los formularios como en los filtros del catálogo.

export const CATEGORIES = [
  "Narrativa",
  "Poesía",
  "Teatro",
  "Infantil y juvenil",
  "Ciencias",
  "Matemáticas",
  "Historia",
  "Filosofía",
  "Arte",
  "Tecnología",
  "Idiomas",
  "Ciencias sociales",
  "Biografías",
  "Referencia",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const LANGUAGES = [
  "Español",
  "Inglés",
  "Francés",
  "Alemán",
  "Italiano",
  "Portugués",
  "Catalán",
  "Gallego",
  "Latín",
] as const;

export function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}
