// Fichas bibliográficas a partir del ISBN.
//
// Cuando alguien cataloga un libro, casi siempre tiene el ISBN a mano. Open
// Library expone una API pública (`jscmd=data`) que devuelve título, autoría,
// editorial, año y páginas de una edición; la consultamos desde el servidor
// para no depender del navegador ni exponer peticiones de terceros.
//
// Este módulo es puro (salvo el `fetch`) y no usa `server-only` porque sólo lo
// consume la acción de servidor; así se puede probar sin arrastrar cookies.

/** Milisegundos que esperamos como mucho a Open Library. */
const TIMEOUT_MS = 5000;

/** Host autorizado para las portadas remotas. */
const COVER_HOST = "covers.openlibrary.org";

/** Año de publicación válido (mismo rango que la validación del formulario). */
const YEAR = /\b(1[0-9]{3}|20[0-9]{2}|21[0-9]{2})\b/;

/** Datos de una ficha que Open Library puede aportar. */
export type IsbnMetadata = {
  title?: string;
  author?: string;
  publisher?: string;
  year?: number;
  pages?: number;
  coverUrl?: string;
};

/** Resultado de consultar un ISBN. */
export type IsbnLookupResult =
  | { status: "success"; data: IsbnMetadata }
  | { status: "invalid" }
  | { status: "notFound" }
  | { status: "error" };

/** Forma (parcial) de una edición de Open Library. */
type OpenLibraryBook = {
  title?: string;
  authors?: Array<{ name?: string }>;
  publishers?: Array<{ name?: string }>;
  publish_date?: string;
  number_of_pages?: number;
  cover?: { small?: string; medium?: string; large?: string };
};

/** Deja sólo los dígitos y la X final (en mayúscula). */
export function normalizeIsbn(raw: string): string {
  return raw.replace(/[^0-9Xx]/g, "").toUpperCase();
}

/** Comprueba el dígito de control de un ISBN-10 o ISBN-13. */
export function isValidIsbn(raw: string): boolean {
  const isbn = normalizeIsbn(raw);

  if (isbn.length === 10) {
    let sum = 0;
    for (let index = 0; index < 9; index += 1) {
      const digit = isbn.charCodeAt(index) - 48;
      if (digit < 0 || digit > 9) return false;
      sum += digit * (10 - index);
    }
    const last = isbn[9];
    const check = last === "X" ? 10 : last.charCodeAt(0) - 48;
    if (check < 0 || check > 10) return false;
    return (sum + check) % 11 === 0;
  }

  if (isbn.length === 13) {
    let sum = 0;
    for (let index = 0; index < 13; index += 1) {
      const digit = isbn.charCodeAt(index) - 48;
      if (digit < 0 || digit > 9) return false;
      sum += digit * (index % 2 === 0 ? 1 : 3);
    }
    return sum % 10 === 0;
  }

  return false;
}

/** Une los nombres de autoría o editorial disponibles. */
function joinNames(values: Array<{ name?: string }> | undefined): string | undefined {
  const names = (values ?? []).map((value) => value.name?.trim()).filter(Boolean);
  return names.length > 0 ? names.join(", ") : undefined;
}

/** Extrae el año de una fecha textual de Open Library («October 1, 1988»). */
function firstYear(value: string | undefined): number | undefined {
  const match = value?.match(YEAR);
  return match ? Number.parseInt(match[1], 10) : undefined;
}

/** Acepta sólo portadas del host autorizado. */
function safeCover(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).host === COVER_HOST ? url : undefined;
  } catch {
    return undefined;
  }
}

/** Convierte la respuesta de Open Library en nuestros campos de ficha. */
function toMetadata(book: OpenLibraryBook): IsbnMetadata {
  const data: IsbnMetadata = {};

  const title = book.title?.trim();
  if (title) data.title = title;

  const author = joinNames(book.authors);
  if (author) data.author = author;

  const publisher = joinNames(book.publishers);
  if (publisher) data.publisher = publisher;

  const year = firstYear(book.publish_date);
  if (year) data.year = year;

  if (book.number_of_pages && book.number_of_pages > 0) data.pages = book.number_of_pages;

  const cover = safeCover(book.cover?.large ?? book.cover?.medium ?? book.cover?.small);
  if (cover) data.coverUrl = cover;

  return data;
}

/**
 * Consulta la ficha de una edición en Open Library.
 *
 * Devuelve `null` si el ISBN no está catalogado y lanza si la consulta falla
 * (red, tiempo de espera o respuesta con error), para que quien llama decida.
 */
export async function fetchIsbnMetadata(isbn: string): Promise<IsbnMetadata | null> {
  const params = new URLSearchParams({
    bibkeys: `ISBN:${isbn}`,
    format: "json",
    jscmd: "data",
  });

  const response = await fetch(`https://openlibrary.org/api/books?${params.toString()}`, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`Open Library respondió ${response.status}`);

  const payload = (await response.json()) as Record<string, OpenLibraryBook>;
  const book = payload[`ISBN:${isbn}`];
  if (!book) return null;

  return toMetadata(book);
}
