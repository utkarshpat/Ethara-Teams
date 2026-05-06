import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "@/lib/guards";
import { logger } from "@/lib/logger";
import { getCurrentUser } from "@/lib/session";

export async function requireApiUser() {
  const user = await getCurrentUser();

  if (!user) {
    logger.warn("auth.api_unauthorized");
    throw new AppError("Authentication required", 401);
  }

  return user;
}

export function apiError(error: unknown) {
  if (error instanceof AppError) {
    logger.warn("api.app_error", {
      status: error.status,
      message: error.message,
    });
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  if (error instanceof ZodError) {
    logger.warn("api.validation_error", {
      issues: error.flatten(),
    });
    return NextResponse.json(
      { error: "Validation failed", issues: error.flatten() },
      { status: 422 },
    );
  }

  logger.error("api.unexpected_error", error);
  return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
}
