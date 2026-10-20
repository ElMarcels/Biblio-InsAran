// Constantes compartidas de la plataforma.

export const SITE_NAME = "Biblioteca Institut d'Aran";
export const SITE_SHORT = "Biblioteca";

/** Institución a la que pertenece la biblioteca (aparece junto al logotipo). */
export const SITE_INSTITUTION = "Institut d'Aran";

/** Nombre de la cookie que guarda el token de sesión. */
export const SESSION_COOKIE = "biblio_session";

/** Duración de una sesión: 7 días. */
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

/** Nombre de la cookie de sesión del área del lector («Mi biblioteca»). */
export const READER_SESSION_COOKIE = "biblio_reader";

/** Duración de la sesión del lector/a: 30 días. */
export const READER_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

/**
 * PIN inicial con el que el alumnado entra en «Mi biblioteca» la primera vez
 * (todavía no ha elegido el suyo). Es el mismo para todas las personas y solo
 * sirve para el primer acceso: acto seguido la plataforma obliga a cambiarlo.
 * El personal lo puede restablecer desde la ficha del lector/a.
 */
export const INITIAL_READER_PIN = "1234";

/** Prórrogas que la persona lectora puede pedir sobre el mismo préstamo. */
export const READER_MAX_RENEWALS = 2;

/** Libros por página en el catálogo público. */
export const CATALOG_PAGE_SIZE = 12;

/** Libros por página en el panel de gestión. */
export const PANEL_PAGE_SIZE = 15;

/** Préstamos y reservas por página en el panel. */
export const CIRCULATION_PAGE_SIZE = 20;

/** Días de préstamo por defecto. */
export const DEFAULT_LOAN_DAYS = 15;
