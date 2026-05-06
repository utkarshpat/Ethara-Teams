import { prisma } from "@/lib/prisma";
import { ensureProjectMembership } from "@/lib/guards";

export async function listProjectUsers(userId: string, projectId: string) {
  await ensureProjectMembership({ userId, projectId });

  return prisma.projectMember.findMany({
    where: { projectId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          image: true,
          role: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}
