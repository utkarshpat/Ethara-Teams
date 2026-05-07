import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  AppError,
  canMutateTask,
  ensureProjectMembership,
  ensureTaskAccess,
} from "@/lib/guards";
import { logger } from "@/lib/logger";
import { triggerProjectEvent } from "@/lib/realtime-bus";
import type {
  taskCreateSchema,
  taskUpdateSchema,
} from "@/modules/tasks/validators";
import { createNotification } from "@/modules/notifications/services";
import type { z } from "zod";

type TaskCreateInput = z.infer<typeof taskCreateSchema>;
type TaskUpdateInput = z.infer<typeof taskUpdateSchema>;

const taskInclude = {
  assignedTo: {
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      image: true,
      role: true,
    },
  },
  _count: {
    select: {
      comments: true,
    },
  },
} as const;

export async function listProjectTasks(userId: string, projectId: string) {
  await ensureProjectMembership({ userId, projectId });

  return prisma.task.findMany({
    where: {
      projectId,
      deletedAt: null,
    },
    include: taskInclude,
    orderBy: [{ status: "asc" }, { order: "asc" }, { createdAt: "desc" }],
  });
}

export async function createTask(
  userId: string,
  projectId: string,
  input: TaskCreateInput,
) {
  await ensureProjectMembership({ userId, projectId, roles: ["ADMIN"] });

  if (input.assignedToId) {
    await ensureProjectMembership({
      userId: input.assignedToId,
      projectId,
    });
  }

  const maxOrder = await prisma.task.aggregate({
    where: {
      projectId,
      status: "TODO",
      deletedAt: null,
    },
    _max: {
      order: true,
    },
  });

  const task = await prisma.task.create({
    data: {
      title: input.title,
      description: input.description || null,
      priority: input.priority,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      assignedToId: input.assignedToId || null,
      projectId,
      order: (maxOrder._max.order ?? -1) + 1,
    },
    include: taskInclude,
  });

  if (task.assignedToId) {
    await createNotification({
      userId: task.assignedToId,
      type: "ASSIGNMENT",
      title: "New task assigned",
      body: task.title,
      link: `/dashboard?projectId=${projectId}&taskId=${task.id}`,
    });
  }

  await triggerProjectEvent(projectId, "task:created", task);
  logger.info("task.created", {
    userId,
    projectId,
    taskId: task.id,
    assignedToId: task.assignedToId,
  });
  return task;
}

export async function updateTask(
  userId: string,
  taskId: string,
  input: TaskUpdateInput,
) {
  const { task, membership } = await ensureTaskAccess(userId, taskId);
  const allowed = canMutateTask(userId, task.assignedToId, membership.effectiveRole);

  if (!allowed) {
    logger.warn("task.update_denied", { userId, taskId });
    throw new AppError("Only admins or assignees can update this task", 403);
  }

  const hasAdminOnlyChanges =
    input.title !== undefined ||
    input.description !== undefined ||
    input.priority !== undefined ||
    input.dueDate !== undefined ||
    input.assignedToId !== undefined ||
    input.metadata !== undefined;

  if (membership.effectiveRole !== "ADMIN" && hasAdminOnlyChanges) {
    logger.warn("task.admin_update_denied", { userId, taskId });
    throw new AppError("Only admins can edit task details or assignments", 403);
  }

  if (input.assignedToId) {
    await ensureProjectMembership({
      userId: input.assignedToId,
      projectId: task.projectId,
    });
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      title: input.title,
      description: input.description,
      status: input.status,
      priority: input.priority,
      dueDate:
        input.dueDate === undefined
          ? undefined
          : input.dueDate
            ? new Date(input.dueDate)
            : null,
      assignedToId: input.assignedToId,
      order: input.order,
      metadata:
        input.metadata === undefined
          ? undefined
          : input.metadata === null
            ? Prisma.JsonNull
            : (input.metadata as Prisma.InputJsonValue),
    },
    include: taskInclude,
  });

  if (input.assignedToId && input.assignedToId !== task.assignedToId) {
    await createNotification({
      userId: input.assignedToId,
      type: "ASSIGNMENT",
      title: "Task assignment updated",
      body: updated.title,
      link: `/dashboard?projectId=${task.projectId}&taskId=${taskId}`,
    });
  }

  if (
    input.status &&
    input.status !== task.status &&
    updated.assignedToId &&
    updated.assignedToId !== userId
  ) {
    await createNotification({
      userId: updated.assignedToId,
      type: "STATUS_CHANGE",
      title: "Task status updated",
      body: `${updated.title} moved to ${updated.status.replace("_", " ")}`,
      link: `/dashboard?projectId=${task.projectId}&taskId=${taskId}`,
    });
  }

  if (input.status && input.status !== task.status) {
    await triggerProjectEvent(task.projectId, "task:status_changed", updated);
  } else {
    await triggerProjectEvent(task.projectId, "task:updated", updated);
  }

  logger.info("task.updated", {
    userId,
    taskId,
    projectId: task.projectId,
    status: updated.status,
  });
  return updated;
}

export async function softDeleteTask(userId: string, taskId: string) {
  const { task } = await ensureTaskAccess(userId, taskId);
  await ensureProjectMembership({
    userId,
    projectId: task.projectId,
    roles: ["ADMIN"],
  });

  const deleted = await prisma.task.update({
    where: { id: taskId },
    data: { deletedAt: new Date() },
  });

  await triggerProjectEvent(task.projectId, "task:deleted", { id: taskId });
  logger.info("task.soft_deleted", { userId, taskId, projectId: task.projectId });
  return deleted;
}
