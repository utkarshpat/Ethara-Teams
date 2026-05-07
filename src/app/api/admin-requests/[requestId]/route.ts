import { NextResponse } from "next/server";
import { apiError, requireApiUser } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  adminRequestReviewSchema,
  listAdminRequests,
  reviewAdminRequest,
} from "@/modules/admin-requests";

type AdminRequestRouteContext = {
  params: Promise<{
    requestId: string;
  }>;
};

function serializeAdminRequest(
  request: Awaited<ReturnType<typeof listAdminRequests>>[number],
) {
  return {
    id: request.id,
    status: request.status,
    message: request.message,
    reviewedAt: request.reviewedAt?.toISOString() ?? null,
    createdAt: request.createdAt.toISOString(),
    user: request.user,
    reviewedBy: request.reviewedBy,
  };
}

export async function PATCH(
  request: Request,
  context: AdminRequestRouteContext,
) {
  try {
    const user = await requireApiUser();
    enforceRateLimit(request, {
      scope: "admin-requests:review",
      userId: user.id,
      limit: 30,
      windowMs: 60_000,
    });
    const { requestId } = await context.params;
    const input = adminRequestReviewSchema.parse(await request.json());
    const adminRequest = await reviewAdminRequest(user.id, requestId, input);
    return NextResponse.json(serializeAdminRequest(adminRequest));
  } catch (error) {
    return apiError(error);
  }
}
