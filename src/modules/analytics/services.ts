import { prisma } from "@/lib/prisma";
import { ensureProjectMembership } from "@/lib/guards";
import { logger } from "@/lib/logger";

export async function getProjectAnalytics(userId: string, projectId: string) {
  await ensureProjectMembership({ userId, projectId });

  const [status, priority, overdue, total] = await Promise.all([
    prisma.task.groupBy({
      by: ["status"],
      where: {
        projectId,
        deletedAt: null,
      },
      _count: {
        id: true,
      },
    }),
    prisma.task.groupBy({
      by: ["priority"],
      where: {
        projectId,
        deletedAt: null,
      },
      _count: {
        id: true,
      },
    }),
    prisma.task.count({
      where: {
        projectId,
        deletedAt: null,
        dueDate: {
          lt: new Date(),
        },
        status: {
          not: "DONE",
        },
      },
    }),
    prisma.task.count({
      where: {
        projectId,
        deletedAt: null,
      },
    }),
  ]);

  const result = {
    total,
    overdue,
    status: status.map((item) => ({
      name: item.status,
      value: item._count.id,
    })),
    priority: priority.map((item) => ({
      name: item.priority,
      value: item._count.id,
    })),
  };

  logger.info("analytics.project_loaded", { userId, projectId, total, overdue });
  return result;
}
