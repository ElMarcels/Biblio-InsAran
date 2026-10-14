import { z } from "zod";

import { CATEGORIES, LANGUAGES } from "./catalog";

/** Estado que devuelven las Server Actions a los formularios. */
export type ActionState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string>;
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
