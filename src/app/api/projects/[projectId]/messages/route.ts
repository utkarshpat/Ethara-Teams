import { NextResponse } from "next/server";
import { apiError, requireApiUser } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  createProjectMessage,
  listProjectMessages,
  projectMessageCreateSchema,
} from "@/modules/project-chat";

type ProjectRouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

export async function GET(_request: Request, context: ProjectRouteContext) {
  try {
    const user = await requireApiUser();
    const { projectId } = await context.params;
    const url = new URL(_request.url);
    const messages = await listProjectMessages(user.id, projectId, {
      cursor: url.searchParams.get("cursor"),
      limit: Number(url.searchParams.get("limit") ?? 20),
    });
    return NextResponse.json(messages);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request, context: ProjectRouteContext) {
  try {
    const user = await requireApiUser();
    enforceRateLimit(request, {
      scope: "project-messages:create",
      userId: user.id,
      limit: 30,
      windowMs: 60_000,
    });
    const { projectId } = await context.params;
    const input = projectMessageCreateSchema.parse(await request.json());
    const message = await createProjectMessage(user.id, projectId, input);
    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
