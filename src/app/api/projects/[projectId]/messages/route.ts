import { NextResponse } from "next/server";
import { apiError, requireApiUser } from "@/lib/api";
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
    const messages = await listProjectMessages(user.id, projectId);
    return NextResponse.json(messages);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request, context: ProjectRouteContext) {
  try {
    const user = await requireApiUser();
    const { projectId } = await context.params;
    const input = projectMessageCreateSchema.parse(await request.json());
    const message = await createProjectMessage(user.id, projectId, input);
    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
