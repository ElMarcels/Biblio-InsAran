import { conversationResponse } from "@/lib/ai/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  const { id } = await context.params;
  return conversationResponse(request, id, { staffOnly: true });
}

export async function PATCH(request: Request, context: Context) {
  const { id } = await context.params;
  return conversationResponse(request, id, { staffOnly: true });
}

export async function DELETE(request: Request, context: Context) {
  const { id } = await context.params;
  return conversationResponse(request, id, { staffOnly: true });
}
