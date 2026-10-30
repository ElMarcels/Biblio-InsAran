import { chatResponse } from "@/lib/ai/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/** Chat público y de «Mi biblioteca». Nunca concede herramientas de panel. */
export async function POST(request: Request) {
  return chatResponse(request);
}
