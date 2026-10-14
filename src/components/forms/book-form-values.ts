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
  description: string;
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
  description: "",
};
