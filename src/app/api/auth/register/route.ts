import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { registerSchema, registerUser } from "@/modules/auth";

export async function POST(request: Request) {
  try {
    const input = registerSchema.parse(await request.json());
    const user = await registerUser(input);
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
