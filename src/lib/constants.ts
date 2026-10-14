// Constantes compartidas de la plataforma.

export const SITE_NAME = "Biblioteca del Instituto";
export const SITE_SHORT = "Biblioteca";

/** Nombre de la cookie que guarda el token de sesión. */
export const SESSION_COOKIE = "biblio_session";

/** Duración de una sesión: 7 días. */
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

/** Libros por página en el catálogo público. */
export const CATALOG_PAGE_SIZE = 12;

/** Libros por página en el panel de gestión. */
export const PANEL_PAGE_SIZE = 15;
