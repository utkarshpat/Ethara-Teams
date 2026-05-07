import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";
import { registerSchema, registerUser } from "@/modules/auth";

export async function POST(request: Request) {
  try {
    enforceRateLimit(request, {
      scope: "auth:register",
      limit: 5,
      windowMs: 60_000,
    });
    const input = registerSchema.parse(await request.json());
    const user = await registerUser(input);
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
