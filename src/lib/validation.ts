import { z } from "zod";

import type { TranslationKey } from "./i18n/messages";
import type { TranslateParams } from "./i18n/translate";
import { CATEGORIES, LANGUAGES } from "./catalog";

/**
 * Marca un literal como clave de traducción. Los mensajes de Zod viajan como
 * claves hasta el formulario, que es quien los traduce.
 */
function msg(key: TranslationKey): string {
  return key;
}

/** Coincidencia sospechosa con un libro que ya está en el catálogo. */
export type DuplicateMatch = {
  id: string;
  title: string;
  author: string;
  /** Por qué se ha considerado duplicado. */
  reason: "isbn" | "title";
};

/** Clave y datos del aviso de duplicado que se muestra antes de guardar. */
export function duplicateMessage(duplicate: DuplicateMatch): {
  key: TranslationKey;
  params: TranslateParams;
} {
  const params = { title: duplicate.title, author: duplicate.author };
  if (duplicate.reason === "isbn") {
    return { key: "actions.duplicateIsbn", params };
  }
  return { key: "actions.duplicateTitle", params };
}

/** Estado que devuelven las Server Actions a los formularios. */
export type ActionState = {
  status: "idle" | "error" | "success" | "warning";
  /** Clave del mensaje (se traduce en el formulario). */
  message?: TranslationKey;
  /** Valores para los marcadores `{nombre}` del mensaje. */
  messageParams?: TranslateParams;
  fieldErrors?: Record<string, TranslationKey>;
  duplicate?: DuplicateMatch | null;
};

export const initialActionState: ActionState = { status: "idle" };

/**
 * Convierte los errores de Zod en un mapa `campo -> primera clave`.
 * Se construye a mano a partir de `issues` para no depender de utilidades
 * concretas de la versión de Zod.
 */
export function fieldErrors(error: z.ZodError): Record<string, TranslationKey> {
  const result: Record<string, TranslationKey> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "_form";
    if (!result[key]) result[key] = issue.message as TranslationKey;
  }
  return result;
}

function optionalText(max: number) {
  return z
    .string()
    .trim()
    .max(max, msg("validation.textTooLong"))
    .transform((value) => (value === "" ? undefined : value))
    .optional();
}

// ---------------------------------------------------------------------------
// Etiquetas (materias libres)
// ---------------------------------------------------------------------------

/** Máximo de etiquetas por libro. */
export const MAX_TAGS = 12;
/** Longitud máxima de cada etiqueta. */
export const MAX_TAG_LENGTH = 40;

/**
 * Normaliza una etiqueta: quita espacios sobrantes y pone la inicial en
 * mayúscula, para que "novela" y "Novela" sean la misma materia.
 */
export function normalizeTag(value: string): string {
  const clean = value.trim().replace(/\s+/g, " ");
  if (!clean) return "";
  return clean.charAt(0).toLocaleUpperCase("es") + clean.slice(1);
}

/** Convierte un texto con etiquetas separadas por comas en una lista limpia. */
export function parseTags(value: string): string[] {
  const seen = new Set<string>();
  for (const raw of value.split(/[,;\n]/)) {
    const tag = normalizeTag(raw.slice(0, MAX_TAG_LENGTH));
    if (tag) seen.add(tag);
    if (seen.size >= MAX_TAGS) break;
  }
  return Array.from(seen);
}

const tagsSchema = z
  .string()
  .max(1000, msg("validation.tooManyTags"))
  .optional()
  .transform((value) => parseTags(value ?? ""));

// ---------------------------------------------------------------------------
// Acceso
// ---------------------------------------------------------------------------

export const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, msg("validation.usernameRequired"))
    .max(64, msg("validation.usernameTooLong")),
  password: z.string().min(1, msg("validation.passwordRequired")).max(200),
});

// ---------------------------------------------------------------------------
// Libros
// ---------------------------------------------------------------------------

/** Host del que servimos las portadas (ver `src/lib/covers.ts`). */
const COVER_HOST = "covers.openlibrary.org";

/** ¿Es una URL de portada de Open Library? */
export function isAllowedCoverUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === COVER_HOST;
  } catch {
    return false;
  }
}

const coverUrlSchema = z
  .string()
  .trim()
  .max(500, msg("validation.coverUrlTooLong"))
  .optional()
  .transform((value) => (value ? value : undefined))
  .refine((value) => value === undefined || isAllowedCoverUrl(value), {
    message: msg("validation.coverUrlHost"),
  });

export const bookSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, msg("validation.bookTitleRequired"))
    .max(220, msg("validation.bookTitleTooLong")),
  author: z
    .string()
    .trim()
    .min(1, msg("validation.bookAuthorRequired"))
    .max(180, msg("validation.bookAuthorTooLong")),
  category: z.enum(CATEGORIES, { message: msg("validation.bookCategory") }),
  isbn: optionalText(32),
  publisher: optionalText(160),
  year: z
    .union([z.literal(""), z.coerce.number().int()])
    .optional()
    .transform((value) => (value === "" || value === undefined ? undefined : value))
    .refine((value) => value === undefined || (value >= 1000 && value <= 2200), {
      message: msg("validation.bookYear"),
    }),
  language: z.enum(LANGUAGES).default("Español"),
  pages: z
    .union([z.literal(""), z.coerce.number().int()])
    .optional()
    .transform((value) => (value === "" || value === undefined ? undefined : value))
    .refine((value) => value === undefined || (value >= 1 && value <= 100000), {
      message: msg("validation.bookPages"),
    }),
  copies: z.coerce
    .number({ message: msg("validation.bookCopiesRequired") })
    .int(msg("validation.bookCopiesInteger"))
    .min(1, msg("validation.bookCopiesMin"))
    .max(9999, msg("validation.bookCopiesMax")),
  location: optionalText(60),
  recordNumber: optionalText(40),
  cdu: optionalText(40),
  coverUrl: coverUrlSchema,
  description: optionalText(2000),
  tags: tagsSchema,
});

export type BookInput = z.infer<typeof bookSchema>;

// ---------------------------------------------------------------------------
// Usuarios (solo dueño)
// ---------------------------------------------------------------------------

export const usernameSchema = z
  .string()
  .trim()
  .min(3, msg("validation.usernameMin"))
  .max(32, msg("validation.usernameMax"))
  .regex(
    /^[a-zA-Z0-9._-]+$/,
    msg("validation.usernamePattern"),
  );

export const createUserSchema = z.object({
  username: usernameSchema,
  displayName: z
    .string()
    .trim()
    .min(2, msg("validation.displayNameRequired"))
    .max(120, msg("validation.nameTooLong")),
  password: z
    .string()
    .min(8, msg("validation.passwordMin"))
    .max(200, msg("validation.passwordMax")),
  // Rol de la cuenta nueva. Si llega un valor inesperado se crea como editora,
  // de modo que nunca se pueda escalar privilegios manipulando el formulario.
  role: z.enum(["EDITOR", "ADMIN"]).catch("EDITOR"),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, msg("validation.currentPasswordRequired")),
    newPassword: z
      .string()
      .min(8, msg("validation.newPasswordMin"))
      .max(200),
    confirmPassword: z.string().min(1, msg("validation.confirmPasswordRequired")),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: msg("validation.passwordsMismatch"),
    path: ["confirmPassword"],
  });

export const resetPasswordSchema = z.object({
  userId: z.string().min(1),
  newPassword: z
    .string()
    .min(8, msg("validation.passwordMin"))
    .max(200, msg("validation.passwordMax")),
});

// ---------------------------------------------------------------------------
// Lectores (préstamos gestionados por el personal)
// ---------------------------------------------------------------------------

export const readerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, msg("validation.readerNameRequired"))
    .max(120, msg("validation.nameTooLong")),
  cardNumber: optionalText(32),
  groupName: optionalText(60),
  email: z
    .union([
      z.literal(""),
      z.string().trim().email(msg("validation.emailInvalid")).max(160),
    ])
    .optional()
    .transform((value) => (value === "" || value === undefined ? undefined : value)),
  phone: optionalText(30),
  notes: optionalText(500),
});

export type ReaderInput = z.infer<typeof readerSchema>;

/** Suspensión temporal del préstamo (sanción por retrasos u otras causas). */
export const suspensionSchema = z.object({
  readerId: z.string().min(1, msg("validation.readerIdRequired")),
  /** Fecha `YYYY-MM-DD` hasta la que dura la suspensión. Vacía = levantarla. */
  until: z
    .string()
    .trim()
    .max(10)
    .optional()
    .transform((value) => (value ? value : undefined)),
  reason: optionalText(200),
});

export type SuspensionInput = z.infer<typeof suspensionSchema>;

/** Convierte "2026-03-15" en una fecha al final de ese día (en UTC). */
export function parseDateInput(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(`${year}-${month}-${day}T23:59:59.999Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Fecha de hoy en formato `YYYY-MM-DD`, para los campos `type="date"`. */
export function todayInput(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Suma días a una fecha `YYYY-MM-DD` y devuelve otra `YYYY-MM-DD`. */
export function addDaysInput(value: string, days: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return value;
  const date = new Date(`${value.trim()}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Préstamos y reservas
// ---------------------------------------------------------------------------

export const loanSchema = z.object({
  bookId: z.string().min(1, msg("validation.loanBookRequired")),
  readerId: z.string().min(1, msg("validation.loanReaderRequired")),
  dueAt: z
    .string()
    .trim()
    .min(1, msg("validation.loanDueRequired"))
    .refine((value) => parseDateInput(value) !== null, {
      message: msg("validation.loanDueInvalid"),
    }),
  notes: optionalText(500),
});

export type LoanInput = z.infer<typeof loanSchema>;

export const reservationSchema = z.object({
  bookId: z.string().min(1, msg("validation.loanBookRequired")),
  readerId: z.string().min(1, msg("validation.loanReaderRequired")),
  notes: optionalText(500),
});

// ---------------------------------------------------------------------------
// Listas curadas (colecciones)
// ---------------------------------------------------------------------------

export const collectionSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, msg("validation.collectionNameRequired"))
    .max(80, msg("validation.collectionNameTooLong")),
  description: optionalText(300),
});

export type CollectionInput = z.infer<typeof collectionSchema>;

/**
 * Convierte un nombre en un identificador de URL: "Club de lectura" ->
 * "club-de-lectura". Sin acentos ni signos, para que el enlace sea legible.
 */
export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
