import "server-only";

import crypto from "node:crypto";
import bwipjs from "bwip-js/node";

import { SITE_NAME } from "./constants";

/**
 * Verificación en dos pasos con TOTP (RFC 6238).
 *
 * - Algoritmo SHA-1, 6 dígitos y periodos de 30 segundos (compatible con
 *   Google Authenticator, Authy, 1Password, etc.).
 * - El secreto se guarda cifrado con AES-256-GCM; la clave se deriva de
 *   `SESSION_SECRET`.
 * - Los códigos de recuperación se guardan solo como hash SHA-256.
 */

const DIGITS = 6;
const PERIOD_SECONDS = 30;
/** Ventana de tolerancia: el periodo anterior y el siguiente. */
const WINDOW = 1;

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
/** Sin caracteres confundibles (0/O, 1/I/L). */
const RECOVERY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const RECOVERY_CODE_COUNT = 10;
export const RECOVERY_CODE_LENGTH = 10;
export const TWO_FACTOR_PENDING_TTL_MS = 15 * 60 * 1000;

// ---------------------------------------------------------------------------
// Base32
// ---------------------------------------------------------------------------

export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

export function base32Decode(value: string): Buffer {
  const clean = value.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let current = 0;
  const bytes: number[] = [];

  for (const char of clean) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index < 0) continue;
    current = (current << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((current >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

// ---------------------------------------------------------------------------
// TOTP
// ---------------------------------------------------------------------------

export function generateTotpSecret(): string {
  return base32Encode(crypto.randomBytes(20));
}

function hotp(secret: Buffer, counter: number): string {
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));

  const digest = crypto.createHmac("sha1", secret).update(message).digest();
  const offset = digest[digest.length - 1]! & 0x0f;
  const binary =
    ((digest[offset]! & 0x7f) << 24) |
    (digest[offset + 1]! << 16) |
    (digest[offset + 2]! << 8) |
    digest[offset + 3]!;

  return String(binary % 10 ** DIGITS).padStart(DIGITS, "0");
}

function sameCode(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return (
    left.length === right.length && crypto.timingSafeEqual(left, right)
  );
}

export function generateTotp(secret: string, at = Date.now()): string {
  const counter = Math.floor(at / 1000 / PERIOD_SECONDS);
  return hotp(base32Decode(secret), counter);
}

export function verifyTotp(
  secret: string,
  code: string,
  at = Date.now(),
): boolean {
  const clean = code.replace(/\s+/g, "");
  if (!new RegExp(`^\\d{${DIGITS}}$`).test(clean)) return false;

  const counter = Math.floor(at / 1000 / PERIOD_SECONDS);
  const key = base32Decode(secret);
  if (key.length === 0) return false;

  for (let offset = -WINDOW; offset <= WINDOW; offset += 1) {
    if (sameCode(hotp(key, counter + offset), clean)) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Cifrado del secreto (AES-256-GCM)
// ---------------------------------------------------------------------------

function encryptionKey(): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "Falta la variable de entorno SESSION_SECRET (mínimo 32 caracteres).",
    );
  }
  return crypto
    .createHash("sha256")
    .update(`biblio-two-factor:${secret}`)
    .digest();
}

export function encryptTwoFactorSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    "v1",
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

/** Devuelve `null` si el valor no es válido o se ha manipulado. */
export function decryptTwoFactorSecret(value: string): string | null {
  try {
    const [version, iv, tag, data] = value.split(".");
    if (version !== "v1" || !iv || !tag || !data) return null;

    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      encryptionKey(),
      Buffer.from(iv, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    const plain = Buffer.concat([
      decipher.update(Buffer.from(data, "base64url")),
      decipher.final(),
    ]);
    return plain.toString("utf8");
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Códigos de recuperación
// ---------------------------------------------------------------------------

export function normalizeRecoveryCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function generateRecoveryCodes(count = RECOVERY_CODE_COUNT): string[] {
  const codes: string[] = [];
  while (codes.length < count) {
    let code = "";
    while (code.length < RECOVERY_CODE_LENGTH) {
      const byte = crypto.randomBytes(1)[0]!;
      // Rechazo de muestras para no sesgar el alfabeto.
      if (byte >= Math.floor(256 / RECOVERY_ALPHABET.length) * RECOVERY_ALPHABET.length) {
        continue;
      }
      code += RECOVERY_ALPHABET[byte % RECOVERY_ALPHABET.length];
    }
    const formatted = `${code.slice(0, 5)}-${code.slice(5)}`;
    if (!codes.includes(formatted)) codes.push(formatted);
  }
  return codes;
}

export function hashRecoveryCode(value: string): string {
  return crypto
    .createHash("sha256")
    .update(normalizeRecoveryCode(value))
    .digest("hex");
}

// ---------------------------------------------------------------------------
// Verificación completa (TOTP o código de recuperación)
// ---------------------------------------------------------------------------

export type SecondFactorResult = {
  valid: boolean;
  usedRecoveryCode: boolean;
  /** Códigos de recuperación que quedan (sin el usado, si procede). */
  remainingRecoveryCodes: string[];
};

/**
 * Comprueba un código TOTP o de recuperación. Si se usa un código de
 * recuperación, se devuelve la lista restante para que la acción lo consuma.
 */
export function verifySecondFactor(input: {
  secret: string | null;
  recoveryCodeHashes: string[];
  code: string;
  at?: number;
}): SecondFactorResult {
  const { secret, recoveryCodeHashes, code, at } = input;

  if (secret && verifyTotp(secret, code, at)) {
    return {
      valid: true,
      usedRecoveryCode: false,
      remainingRecoveryCodes: recoveryCodeHashes,
    };
  }

  const normalized = normalizeRecoveryCode(code);
  if (normalized.length === RECOVERY_CODE_LENGTH) {
    const hash = hashRecoveryCode(normalized);
    const index = recoveryCodeHashes.indexOf(hash);
    if (index >= 0) {
      return {
        valid: true,
        usedRecoveryCode: true,
        remainingRecoveryCodes: recoveryCodeHashes.filter(
          (_, position) => position !== index,
        ),
      };
    }
  }

  return {
    valid: false,
    usedRecoveryCode: false,
    remainingRecoveryCodes: recoveryCodeHashes,
  };
}

// ---------------------------------------------------------------------------
// Aplicación de autenticación (QR)
// ---------------------------------------------------------------------------

export function buildTotpUrl(input: {
  secret: string;
  accountName: string;
  issuer?: string;
}): string {
  const issuer = input.issuer ?? SITE_NAME;
  const label = `${issuer}:${input.accountName}`;
  const params = new URLSearchParams({
    secret: input.secret,
    issuer,
    algorithm: "SHA1",
    digits: String(DIGITS),
    period: String(PERIOD_SECONDS),
  });
  return `otpauth://totp/${encodeURIComponent(label)}?${params.toString()}`;
}

/** PNG del QR como data URL, listo para un `<img src>`. */
export async function totpQrDataUrl(otpauthUrl: string): Promise<string> {
  const png = await bwipjs.toBuffer({
    bcid: "qrcode",
    text: otpauthUrl,
    scale: 6,
    paddingwidth: 4,
    paddingheight: 4,
    backgroundcolor: "FFFFFF",
  });
  return `data:image/png;base64,${png.toString("base64")}`;
}

/** Parte el secreto en grupos de 4 para que se pueda leer y copiar. */
export function formatTotpSecret(secret: string): string {
  return secret.replace(/(.{4})/g, "$1 ").trim();
}
