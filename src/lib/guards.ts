import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

type GuardInput = {
  userId: string;
  projectId: string;
  roles?: Role[];
};

export async function ensureProjectMembership({
  userId,
  projectId,
  roles,
}: GuardInput) {
  const membership = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId,
      },
    },
    include: {
      project: {
        select: {
          id: true,
          deletedAt: true,
        },
      },
      user: {
        select: {
          role: true,
        },
      },
    },
  });

  if (!membership || membership.project.deletedAt) {
    throw new AppError("Project access denied", 403);
  }

  const effectiveRole: Role =
    membership.role === "ADMIN" || membership.user.role === "ADMIN"
      ? "ADMIN"
      : "MEMBER";

  if (roles?.length && !roles.includes(effectiveRole)) {
    throw new AppError("Insufficient permissions", 403);
  }

  return {
    ...membership,
    effectiveRole,
  };
}

export async function ensureTaskAccess(userId: string, taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      projectId: true,
      assignedToId: true,
      status: true,
      deletedAt: true,
    },
  });

  if (!task || task.deletedAt) {
    throw new AppError("Task not found", 404);
  }

  const membership = await ensureProjectMembership({
    userId,
    projectId: task.projectId,
  });

  return {
    task,
    membership,
  };
}

export function canMutateTask(
  userId: string,
  assignedToId: string | null,
  role: Role,
) {
  return role === "ADMIN" || assignedToId === userId;
}
