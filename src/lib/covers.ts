// Portadas de los libros.
//
// No almacenamos imágenes: guardamos la URL de la portada y la servimos a
// través del optimizador de Next (que ya tiene autorizado el host en
// `next.config.ts`). La búsqueda automática consulta Open Library; si no hay
// portada, el libro sigue mostrando su portada tipográfica.

/** Host autorizado para las portadas remotas. */
const COVER_HOST = "covers.openlibrary.org";

/** Milisegundos que esperamos como mucho a Open Library. */
const TIMEOUT_MS = 5000;

/** Portada de Open Library para un ISBN, si existe. */
async function findByIsbn(isbn: string): Promise<string | null> {
  const digits = isbn.replace(/[^0-9Xx]/g, "");
  if (digits.length < 10) return null;

  const url = `https://${COVER_HOST}/b/isbn/${digits}-L.jpg?default=false`;
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    // `default=false` hace que Open Library responda 404 cuando no hay
    // portada, en lugar de devolver una imagen en blanco.
    if (!response.ok) return null;
    await response.body?.cancel();
    return url.replace("?default=false", "");
  } catch {
    return null;
  }
}

/** Primera portada que Open Library conoce para ese título y autoría. */
async function findByTitle(title: string, author: string): Promise<string | null> {
  const params = new URLSearchParams({
    title,
    limit: "5",
    fields: "cover_i",
  });
  if (author) params.set("author", author);

  try {
    const response = await fetch(`https://openlibrary.org/search.json?${params}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (!response.ok) return null;

    const data = (await response.json()) as { docs?: Array<{ cover_i?: number }> };
    const cover = data.docs?.find((doc) => typeof doc.cover_i === "number");
    if (!cover?.cover_i) return null;
    return `https://${COVER_HOST}/b/id/${cover.cover_i}-L.jpg`;
  } catch {
    return null;
  }
}

/**
 * Busca una portada para el libro. Nunca lanza: si Open Library falla o no
 * encuentra nada, devuelve `null` y el libro conserva su portada tipográfica.
 */
export async function findCoverUrl(input: {
  isbn?: string | null;
  title: string;
  author: string;
}): Promise<string | null> {
  if (input.isbn) {
    const byIsbn = await findByIsbn(input.isbn);
    if (byIsbn) return byIsbn;
  }
  return findByTitle(input.title, input.author);
}
