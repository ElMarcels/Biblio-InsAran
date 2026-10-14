// Auditoría de cobertura i18n: claves usadas con t() frente a los diccionarios.
// Uso: node scripts/i18n-coverage.mjs
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const { MESSAGES, DYNAMIC } = await import(join(root, "src/lib/i18n/messages.ts"));
const { DEFAULT_LOCALE, LOCALES } = await import(join(root, "src/lib/i18n/config.ts"));

/**
 * Los mensajes construidos con datos variables (`${...}`) se reconocen por su
 * forma: se comprueba la plantilla equivalente de cada idioma.
 */
function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function compileDynamic(dynamic) {
  return (dynamic ?? []).map(({ source }) => {
    let pattern = "";
    let last = 0;
    for (const match of source.matchAll(/\{(\w+)\}/g)) {
      pattern += escapeRegex(source.slice(last, match.index));
      pattern += "(.+?)";
      last = match.index + match[0].length;
    }
    pattern += escapeRegex(source.slice(last));
    return new RegExp(`^${pattern}$`);
  });
}

const dynamicPatterns = Object.fromEntries(
  LOCALES.map((locale) => [locale, compileDynamic(DYNAMIC[locale])]),
);

function isDynamic(key, locale) {
  const patterns = dynamicPatterns[locale];
  return samplesFor(key).some((sample) =>
    patterns.some((pattern) => pattern.test(sample)),
  );
}

/**
 * Muestras del mensaje original: los ternarios (${a ? "x" : "y"}) se expanden
 * a cada alternativa y el resto de interpolaciones se sustituyen por un valor.
 */
function samplesFor(key) {
  const ternary = /\$\{[^{}]*\?\s*"([^"]*)"\s*:\s*"([^"]*)"\s*\}/;
  const match = key.match(ternary);
  if (match) {
    return [
      ...samplesFor(key.replace(ternary, () => match[1])),
      ...samplesFor(key.replace(ternary, () => match[2])),
    ];
  }
  return [key.replace(/\$\{[^}]*\}/g, "X")];
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

const files = walk(join(root, "src"));
const used = new Map(); // clave -> primer fichero

function add(key, file) {
  if (!key || used.has(key)) return;
  used.set(key, file);
}

for (const file of files) {
  const rel = file.slice(root.length + 1);
  if (rel.startsWith("src/lib/i18n/")) continue;
  const text = readFileSync(file, "utf8");

  for (const m of text.matchAll(/\bt\(\s*"((?:[^"\\\n]|\\.)*)"/g)) add(m[1], rel);
  for (const m of text.matchAll(/\bt\(\s*'((?:[^'\\\n]|\\.)*)'/g)) add(m[1], rel);
  // Etiquetas de navegación y mensajes de acciones que se traducen al pintarlos.
  for (const m of text.matchAll(/\blabel:\s*"((?:[^"\\\n]|\\.)*)"/g)) add(m[1], rel);
  for (const m of text.matchAll(/\bmessage:\s*"((?:[^"\\\n]|\\.)*)"/g)) add(m[1], rel);
  for (const m of text.matchAll(/\bmessage:\s*`((?:[^`\\]|\\.)*)`/g)) add(m[1], rel);
  // Textos que se traducen sin pasar por un literal de t(): mapas de etiquetas
  // de actividad (AUDIT_LABELS), avisos guardados (FLASH), pestañas de estado
  // (STATES) y formas del pluralizador.
  for (const m of text.matchAll(/\btext:\s*"((?:[^"\\\n]|\\.)*)"/g)) add(m[1], rel);
  for (const m of text.matchAll(/^\s*[A-Z][A-Z0-9_]{2,}:\s*"((?:[^"\\\n]|\\.)*)"/gm)) {
    add(m[1], rel);
  }
  for (const m of text.matchAll(/\bpluralize\(\s*[^,]+,\s*"([^"]+)",\s*"([^"]+)"/g)) {
    add(m[1], rel);
    add(m[2], rel);
  }
  for (const m of text.matchAll(
    /^\s*(?:cread[oa]s?|editad[oa]s?|activad[oa]s?|desactivad[oa]s?|eliminad[oa]s?|anulad[oa]s?|servid[oa]s?|activos|vencidos|devueltos|todos):\s*"((?:[^"\\\n]|\\.)*)"/gm,
  )) {
    add(m[1], rel);
  }
}

const dictionaries = Object.fromEntries(LOCALES.map((l) => [l, MESSAGES[l] ?? {}]));
const missing = Object.fromEntries(
  LOCALES.filter((l) => l !== DEFAULT_LOCALE).map((l) => [l, []]),
);
const dynamicKeys = new Map();

for (const [key, file] of used) {
  if (key.includes("${")) dynamicKeys.set(key, file);
  for (const locale of Object.keys(missing)) {
    if (key in dictionaries[locale]) continue;
    if (key.includes("${") && isDynamic(key, locale)) continue;
    missing[locale].push([key, file]);
  }
}

console.log(`Claves usadas: ${used.size} (con datos variables: ${dynamicKeys.size})`);
for (const [locale, list] of Object.entries(missing)) {
  console.log(`\n=== ${locale}: faltan ${list.length} de ${used.size} ===`);
  for (const [key, file] of list) console.log(`  [${file}] ${key}`);
}
