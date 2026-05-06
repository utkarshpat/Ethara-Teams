import { NextResponse } from "next/server";
import { apiError, requireApiUser } from "@/lib/api";
import {
  commentCreateSchema,
  createTaskComment,
  listTaskComments,
} from "@/modules/comments";

type TaskRouteContext = {
  params: Promise<{
    taskId: string;
  }>;
};

export async function GET(_request: Request, context: TaskRouteContext) {
  try {
    const user = await requireApiUser();
    const { taskId } = await context.params;
    const comments = await listTaskComments(user.id, taskId);
    return NextResponse.json(comments);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request, context: TaskRouteContext) {
  try {
    const user = await requireApiUser();
    const { taskId } = await context.params;
    const input = commentCreateSchema.parse(await request.json());
    const comment = await createTaskComment(user.id, taskId, input);
    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
