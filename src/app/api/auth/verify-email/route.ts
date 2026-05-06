import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { verifyEmail } from "@/modules/auth";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const email = url.searchParams.get("email");
    const token = url.searchParams.get("token");

    if (!email || !token) {
      return NextResponse.redirect(new URL("/login?verified=invalid", request.url));
    }

    await verifyEmail(email, token);
    return NextResponse.redirect(new URL("/login?verified=1", request.url));
  } catch (error) {
    const response = apiError(error);
    if (response.status >= 400 && response.status < 500) {
      return NextResponse.redirect(new URL("/login?verified=invalid", request.url));
    }
    return response;
  }
}
