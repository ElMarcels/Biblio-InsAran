import { z } from "zod";

import { CATEGORIES, LANGUAGES } from "./catalog";

/** Coincidencia sospechosa con un libro que ya está en el catálogo. */
export type DuplicateMatch = {
  id: string;
  title: string;
  author: string;
  /** Por qué se ha considerado duplicado. */
  reason: "isbn" | "title";
};

/** Texto del aviso de duplicado que se muestra antes de guardar. */
export function duplicateMessage(duplicate: DuplicateMatch): string {
  if (duplicate.reason === "isbn") {
    return `Ya hay un libro en el catálogo con este mismo ISBN: «${duplicate.title}» de ${duplicate.author}.`;
  }
  return `Ya hay un libro con el mismo título y autoría: «${duplicate.title}» de ${duplicate.author}.`;
}

/** Estado que devuelven las Server Actions a los formularios. */
export type ActionState = {
  status: "idle" | "error" | "success" | "warning";
  message?: string;
  fieldErrors?: Record<string, string>;
  duplicate?: DuplicateMatch | null;
};

export const initialActionState: ActionState = { status: "idle" };

/**
 * Convierte los errores de Zod en un mapa `campo -> primer mensaje`.
 * Se construye a mano a partir de `issues` para no depender de utilidades
 * concretas de la versión de Zod.
 */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "_form";
    if (!result[key]) result[key] = issue.message;
  }
  return result;
}

function optionalText(max: number, label: string) {
  return z
    .string()
    .trim()
    .max(max, `${label} no puede superar los ${max} caracteres.`)
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
  .max(1000, "Hay demasiadas etiquetas.")
  .optional()
  .transform((value) => parseTags(value ?? ""));

// ---------------------------------------------------------------------------
// Acceso
// ---------------------------------------------------------------------------

export const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, "Escribe tu nombre de usuario.")
    .max(64, "El nombre de usuario es demasiado largo."),
  password: z.string().min(1, "Escribe tu contraseña.").max(200),
});

// ---------------------------------------------------------------------------
// Libros
// ---------------------------------------------------------------------------

export const bookSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "El título es obligatorio.")
    .max(220, "El título no puede superar los 220 caracteres."),
  author: z
    .string()
    .trim()
    .min(1, "El autor es obligatorio.")
    .max(180, "El autor no puede superar los 180 caracteres."),
  category: z.enum(CATEGORIES, { message: "Selecciona una categoría válida." }),
  isbn: optionalText(32, "El ISBN"),
  publisher: optionalText(160, "La editorial"),
  year: z
    .union([z.literal(""), z.coerce.number().int()])
    .optional()
    .transform((value) => (value === "" || value === undefined ? undefined : value))
    .refine((value) => value === undefined || (value >= 1000 && value <= 2200), {
      message: "El año debe estar entre 1000 y 2200.",
    }),
  language: z.enum(LANGUAGES).default("Español"),
  pages: z
    .union([z.literal(""), z.coerce.number().int()])
    .optional()
    .transform((value) => (value === "" || value === undefined ? undefined : value))
    .refine((value) => value === undefined || (value >= 1 && value <= 100000), {
      message: "El número de páginas no es válido.",
    }),
  copies: z.coerce
    .number({ message: "Indica cuántos ejemplares hay." })
    .int("Debe ser un número entero.")
    .min(1, "Debe haber al menos un ejemplar.")
    .max(9999, "Demasiados ejemplares."),
  location: optionalText(60, "La ubicación"),
  description: optionalText(2000, "La descripción"),
  tags: tagsSchema,
});

export type BookInput = z.infer<typeof bookSchema>;

// ---------------------------------------------------------------------------
// Usuarios (solo dueño)
// ---------------------------------------------------------------------------

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "El usuario debe tener al menos 3 caracteres.")
  .max(32, "El usuario no puede superar los 32 caracteres.")
  .regex(
    /^[a-zA-Z0-9._-]+$/,
    "Solo se permiten letras, números y los signos punto, guion y guion bajo.",
  );

export const createUserSchema = z.object({
  username: usernameSchema,
  displayName: z
    .string()
    .trim()
    .min(2, "Escribe el nombre de la persona.")
    .max(120, "El nombre es demasiado largo."),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres.")
    .max(200, "La contraseña es demasiado larga."),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Escribe tu contraseña actual."),
    newPassword: z
      .string()
      .min(8, "La nueva contraseña debe tener al menos 8 caracteres.")
      .max(200),
    confirmPassword: z.string().min(1, "Repite la nueva contraseña."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

export const resetPasswordSchema = z.object({
  userId: z.string().min(1),
  newPassword: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres.")
    .max(200, "La contraseña es demasiado larga."),
});

// ---------------------------------------------------------------------------
// Lectores (préstamos gestionados por el personal)
// ---------------------------------------------------------------------------

export const readerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Escribe el nombre del lector o lectora.")
    .max(120, "El nombre es demasiado largo."),
  cardNumber: optionalText(32, "El número de carné"),
  groupName: optionalText(60, "El curso o grupo"),
  email: z
    .union([
      z.literal(""),
      z.string().trim().email("El correo no tiene un formato válido.").max(160),
    ])
    .optional()
    .transform((value) => (value === "" || value === undefined ? undefined : value)),
  phone: optionalText(30, "El teléfono"),
  notes: optionalText(500, "Las notas"),
});

export type ReaderInput = z.infer<typeof readerSchema>;

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
  bookId: z.string().min(1, "Selecciona un libro."),
  readerId: z.string().min(1, "Selecciona un lector o lectora."),
  dueAt: z
    .string()
    .trim()
    .min(1, "Indica la fecha de devolución.")
    .refine((value) => parseDateInput(value) !== null, {
      message: "La fecha de devolución no es válida.",
    }),
  notes: optionalText(500, "Las notas"),
});

export type LoanInput = z.infer<typeof loanSchema>;

export const reservationSchema = z.object({
  bookId: z.string().min(1, "Selecciona un libro."),
  readerId: z.string().min(1, "Selecciona un lector o lectora."),
  notes: optionalText(500, "Las notas"),
});
