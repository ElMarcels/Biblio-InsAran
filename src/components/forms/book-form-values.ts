import { CATEGORIES, LANGUAGES } from "@/lib/catalog";

export type BookFormValues = {
  id?: string;
  title: string;
  author: string;
  category: string;
  isbn: string;
  publisher: string;
  year: string;
  language: string;
  pages: string;
  copies: string;
  location: string;
  /** Número de registro de inventario (cuentas anuales). */
  recordNumber: string;
  /** Clasificación Decimal Universal. */
  cdu: string;
  /** URL de la portada, si ya se conoce. */
  coverUrl: string;
  description: string;
  tags: string;
};

export const EMPTY_BOOK: BookFormValues = {
  title: "",
  author: "",
  category: CATEGORIES[0],
  isbn: "",
  publisher: "",
  year: "",
  language: LANGUAGES[0],
  pages: "",
  copies: "1",
  location: "",
  recordNumber: "",
  cdu: "",
  coverUrl: "",
  description: "",
  tags: "",
};
