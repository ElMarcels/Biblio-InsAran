import { NextResponse } from "next/server";

import { runOverdueReminders } from "@/lib/reminders";

/**
 * Recordatorios automáticos de retraso.
 *
 * Lo llama un cron (Vercel Cron cada mañana, o cualquier servicio externo) con
 * la cabecera `Authorization: Bearer <CRON_SECRET>`. Sin `CRON_SECRET` la ruta
 * queda cerrada para que nadie pueda provocar envíos de correo.
 */
export const dynamic = "force-dynamic";

function fail(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return fail("cron-secret-not-configured", 503);

  const header = request.headers.get("authorization") ?? "";
  if (header !== `Bearer ${secret}`) return fail("unauthorized", 401);

  const report = await runOverdueReminders({ trigger: "cron" });
  return NextResponse.json({ ok: true, ...report });
}
