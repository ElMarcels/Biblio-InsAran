import "server-only";

import { headers } from "next/headers";

/**
 * Limitador de peticiones muy sencillo (ventana fija en memoria).
 *
 * Suficiente para frenar ataques de fuerza bruta contra el formulario de
 * acceso en un despliegue de una sola instancia. Si algún día se escala a
 * varios procesos, conviene sustituirlo por un almacén compartido.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

const MAX_ATTEMPTS = 8;
const WINDOW_MS = 10 * 60 * 1000; // 10 minutos

function prune(now: number) {
  if (buckets.size < 5000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export function checkRateLimit(key: string): RateLimitResult {
  const now = Date.now();
  prune(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_ATTEMPTS - 1, retryAfterSeconds: 0 };
  }

  if (bucket.count >= MAX_ATTEMPTS) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return { allowed: true, remaining: MAX_ATTEMPTS - bucket.count, retryAfterSeconds: 0 };
}

export function resetRateLimit(key: string): void {
  buckets.delete(key);
}

/** Clave de limitación basada en la IP del cliente. */
export async function clientKey(scope: string): Promise<string> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  const ip = forwarded
    ? forwarded.split(",")[0]!.trim()
    : (headerList.get("x-real-ip") ?? "desconocida");
  return `${scope}:${ip}`;
}
