import { NextResponse } from "next/server";
import { apiError, requireApiUser } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";
import { assistantChatSchema, chatWithAssistant } from "@/modules/assistant";

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    enforceRateLimit(request, {
      scope: "assistant:chat",
      userId: user.id,
      limit: 20,
      windowMs: 60_000,
    });
    const input = assistantChatSchema.parse(await request.json());
    const result = await chatWithAssistant(user.id, input.message);
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error);
  }
}
