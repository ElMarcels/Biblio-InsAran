import { chatResponse } from "@/lib/ai/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/** Chat del panel. Exige sesión de personal y concede herramientas de gestión. */
export async function POST(request: Request) {
  return chatResponse(request, { staffOnly: true });
}
