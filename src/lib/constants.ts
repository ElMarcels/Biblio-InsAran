// Constantes compartidas de la plataforma.

export const SITE_NAME = "Biblioteca Institut d'Aran";
export const SITE_SHORT = "Biblioteca";

/** Institución a la que pertenece la biblioteca (aparece junto al logotipo). */
export const SITE_INSTITUTION = "Institut d'Aran";

/** Nombre de la cookie que guarda el token de sesión. */
export const SESSION_COOKIE = "biblio_session";

/** Duración de una sesión: 7 días. */
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

/** Libros por página en el catálogo público. */
export const CATALOG_PAGE_SIZE = 12;

/** Libros por página en el panel de gestión. */
export const PANEL_PAGE_SIZE = 15;
