import { AppError } from "@/lib/guards";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { triggerProjectEvent } from "@/lib/realtime-bus";

function effectiveAdmin(
  membership: { role: "ADMIN" | "MEMBER"; user: { role: "ADMIN" | "MEMBER" } },
) {
  return membership.role === "ADMIN" || membership.user.role === "ADMIN";
}

async function requireProjectAdminIncludingDeleted(userId: string, projectId: string) {
  const membership = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId,
      },
    },
    include: {
      user: {
        select: {
          role: true,
        },
      },
      project: true,
    },
  });

  if (!membership) {
    throw new AppError("Project access denied", 403);
  }

  if (!effectiveAdmin(membership)) {
    throw new AppError("Insufficient permissions", 403);
  }

  return membership;
}

export async function listTrash(userId: string) {
  const [projects, tasks] = await Promise.all([
    prisma.project.findMany({
      where: {
        deletedAt: { not: null },
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        members: {
          where: { userId },
          include: {
            user: {
              select: {
                role: true,
              },
            },
          },
        },
        _count: {
          select: {
            tasks: true,
            members: true,
          },
        },
      },
      orderBy: { deletedAt: "desc" },
      take: 50,
    }),
    prisma.task.findMany({
      where: {
        deletedAt: { not: null },
        project: {
          members: {
            some: {
              userId,
            },
          },
        },
      },
      include: {
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
        project: {
          select: {
            id: true,
            name: true,
            deletedAt: true,
            members: {
              where: { userId },
              include: {
                user: {
                  select: {
                    role: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
      orderBy: { deletedAt: "desc" },
      take: 100,
    }),
  ]);

  return {
    projects: projects.map((project) => {
      const membership = project.members[0];

      return {
        id: project.id,
        name: project.name,
        description: project.description,
        deletedAt: project.deletedAt,
        taskCount: project._count.tasks,
        memberCount: project._count.members,
        canRestore: membership ? effectiveAdmin(membership) : false,
      };
    }),
    tasks: tasks.map((task) => {
      const membership = task.project.members[0];

      return {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate,
        deletedAt: task.deletedAt,
        projectId: task.projectId,
        projectName: task.project.name,
        projectDeletedAt: task.project.deletedAt,
        assignedTo: task.assignedTo,
        commentsCount: task._count.comments,
        canRestore: membership ? effectiveAdmin(membership) : false,
      };
    }),
  };
}

export async function restoreProject(userId: string, projectId: string) {
  await requireProjectAdminIncludingDeleted(userId, projectId);

  const project = await prisma.project.update({
    where: { id: projectId },
    data: { deletedAt: null },
  });

  logger.info("project.restored", { userId, projectId });
  return project;
}

export async function restoreTask(userId: string, taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: {
        select: {
          id: true,
          deletedAt: true,
        },
      },
    },
  });

  if (!task || !task.deletedAt) {
    throw new AppError("Task not found in trash", 404);
  }

  if (task.project.deletedAt) {
    throw new AppError("Restore the project before restoring its tasks", 409);
  }

  await requireProjectAdminIncludingDeleted(userId, task.projectId);

  const restored = await prisma.task.update({
    where: { id: taskId },
    data: { deletedAt: null },
    include: {
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
    },
  });

  await triggerProjectEvent(task.projectId, "task:restored", restored);
  logger.info("task.restored", { userId, taskId, projectId: task.projectId });
  return restored;
}
