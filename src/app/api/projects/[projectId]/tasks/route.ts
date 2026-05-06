import { NextResponse } from "next/server";
import { apiError, requireApiUser } from "@/lib/api";
import { createTask, listProjectTasks, taskCreateSchema } from "@/modules/tasks";

function serializeTask(task: Awaited<ReturnType<typeof listProjectTasks>>[number]) {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate?.toISOString() ?? null,
    order: task.order,
    projectId: task.projectId,
    assignedToId: task.assignedToId,
    assignedTo: task.assignedTo,
    commentsCount: task._count.comments,
  };
}

type ProjectRouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

export async function GET(_request: Request, context: ProjectRouteContext) {
  try {
    const user = await requireApiUser();
    const { projectId } = await context.params;
    const tasks = await listProjectTasks(user.id, projectId);
    return NextResponse.json(tasks.map(serializeTask));
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request, context: ProjectRouteContext) {
  try {
    const user = await requireApiUser();
    const { projectId } = await context.params;
    const input = taskCreateSchema.parse(await request.json());
    const task = await createTask(user.id, projectId, input);
    return NextResponse.json(serializeTask(task), { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
