import { NextResponse } from "next/server";
import { apiError, requireApiUser } from "@/lib/api";
import {
  listProjectTasks,
  softDeleteTask,
  taskUpdateSchema,
  updateTask,
} from "@/modules/tasks";

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

type TaskRouteContext = {
  params: Promise<{
    taskId: string;
  }>;
};

export async function PATCH(request: Request, context: TaskRouteContext) {
  try {
    const user = await requireApiUser();
    const { taskId } = await context.params;
    const input = taskUpdateSchema.parse(await request.json());
    const task = await updateTask(user.id, taskId, input);
    return NextResponse.json(
      serializeTask(task as Awaited<ReturnType<typeof listProjectTasks>>[number]),
    );
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_request: Request, context: TaskRouteContext) {
  try {
    const user = await requireApiUser();
    const { taskId } = await context.params;
    await softDeleteTask(user.id, taskId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
