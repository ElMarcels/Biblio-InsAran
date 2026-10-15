"use server";

import { getCurrentUser } from "../auth";
import { fetchIsbnMetadata, isValidIsbn, normalizeIsbn, type IsbnLookupResult } from "../isbn";

/**
 * Consulta la ficha de un libro en Open Library a partir de su ISBN.
 *
 * La usa el formulario de libros para rellenar título, autoría, editorial,
 * año, páginas y, si existe, la portada. Sólo está disponible para el personal
 * autenticado, para no ofrecer un proxy abierto a terceros.
 */
export async function lookupIsbnAction(rawIsbn: string): Promise<IsbnLookupResult> {
  const user = await getCurrentUser();
  if (!user) return { status: "error" };

  const isbn = normalizeIsbn(String(rawIsbn ?? ""));
  if (!isValidIsbn(isbn)) return { status: "invalid" };

  try {
    const data = await fetchIsbnMetadata(isbn);
    if (!data) return { status: "notFound" };
    return { status: "success", data };
  } catch {
    return { status: "error" };
  }
}
