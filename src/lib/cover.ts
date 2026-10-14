// Portadas tipográficas: cada libro genera su propia "tapa" a partir de un
// hash del título. Es determinista (el mismo libro siempre se ve igual) y no
// necesita imágenes externas.

export type CoverVariant = "stack" | "rule" | "corner" | "spine";

export type CoverTheme = {
  background: string;
  foreground: string;
  accent: string;
  variant: CoverVariant;
};

const THEMES: Array<Omit<CoverTheme, "variant">> = [
  { background: "#0e0e11", foreground: "#f1eee7", accent: "#e0401d" },
  { background: "#e0401d", foreground: "#0e0e11", accent: "#f1eee7" },
  { background: "#f1eee7", foreground: "#0e0e11", accent: "#e0401d" },
  { background: "#12303f", foreground: "#f1eee7", accent: "#e0401d" },
  { background: "#0e0e11", foreground: "#e0401d", accent: "#f1eee7" },
  { background: "#e6dfd0", foreground: "#0e0e11", accent: "#12303f" },
];

const VARIANTS: CoverVariant[] = ["stack", "rule", "corner", "spine"];

/** Hash FNV-1a: rápido y bien distribuido para textos cortos. */
function hash(value: string): number {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

export function coverTheme(seed: string): CoverTheme {
  const key = seed.trim() || "Libro";
  const value = hash(key);
  const theme = THEMES[value % THEMES.length]!;
  const variant = VARIANTS[Math.floor(value / THEMES.length) % VARIANTS.length]!;
  return { ...theme, variant };
}

/** Iniciales para la composición tipográfica de la portada. */
export function coverInitials(title: string): string {
  const words = title
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2);
  const source = words.length >= 2 ? [words[0]!, words[1]!] : title.split(/\s+/);
  return source
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}
