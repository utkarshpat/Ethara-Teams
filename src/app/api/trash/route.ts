import { NextResponse } from "next/server";
import { apiError, requireApiUser } from "@/lib/api";
import {
  listTrash,
  restoreProject,
  restoreTask,
  trashRestoreSchema,
} from "@/modules/trash";

function serializeDate(value: Date | null) {
  return value?.toISOString() ?? null;
}

export async function GET() {
  try {
    const user = await requireApiUser();
    const trash = await listTrash(user.id);

    return NextResponse.json({
      projects: trash.projects.map((project) => ({
        ...project,
        deletedAt: serializeDate(project.deletedAt),
      })),
      tasks: trash.tasks.map((task) => ({
        ...task,
        dueDate: serializeDate(task.dueDate),
        deletedAt: serializeDate(task.deletedAt),
        projectDeletedAt: serializeDate(task.projectDeletedAt),
      })),
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireApiUser();
    const input = trashRestoreSchema.parse(await request.json());

    if (input.type === "project") {
      const project = await restoreProject(user.id, input.id);
      return NextResponse.json({
        id: project.id,
        type: "project",
        restored: true,
      });
    }

    const task = await restoreTask(user.id, input.id);
    return NextResponse.json({
      id: task.id,
      type: "task",
      restored: true,
    });
  } catch (error) {
    return apiError(error);
  }
}
