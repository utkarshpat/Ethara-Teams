import { NextResponse } from "next/server";
import { apiError, requireApiUser } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  adminRequestCreateSchema,
  listAdminRequests,
  createAdminRequest,
} from "@/modules/admin-requests";

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

export async function GET() {
  try {
    const user = await requireApiUser();
    const requests = await listAdminRequests(user.id);
    return NextResponse.json(requests.map(serializeAdminRequest));
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    enforceRateLimit(request, {
      scope: "admin-requests:create",
      userId: user.id,
      limit: 5,
      windowMs: 60_000,
    });
    const input = adminRequestCreateSchema.parse(await request.json());
    const adminRequest = await createAdminRequest(user.id, input);
    return NextResponse.json(serializeAdminRequest(adminRequest), { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
