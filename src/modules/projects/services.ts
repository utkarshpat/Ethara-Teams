import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AppError, ensureProjectMembership } from "@/lib/guards";
import { logger } from "@/lib/logger";
import { createInvitation } from "@/modules/invitations";
import type { addMemberSchema, projectCreateSchema } from "@/modules/projects/validators";
import type { z } from "zod";

type ProjectCreateInput = z.infer<typeof projectCreateSchema>;
type AddMemberInput = z.infer<typeof addMemberSchema>;

export async function listProjects(userId: string) {
  return prisma.project.findMany({
    where: {
      deletedAt: null,
      members: {
        some: {
          userId,
        },
      },
    },
    include: {
      members: {
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
      },
      _count: {
        select: {
          tasks: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function createProject(userId: string, input: ProjectCreateInput) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (user?.role !== "ADMIN") {
    logger.warn("project.create_denied", { userId });
    throw new AppError("Only admins can create projects", 403);
  }

  const project = await prisma.project.create({
    data: {
      name: input.name,
      description: input.description || null,
      ownerId: userId,
      members: {
        create: {
          userId,
          role: "ADMIN",
        },
      },
    },
  });

  logger.info("project.created", { userId, projectId: project.id });
  return project;
}

export async function addProjectMember(
  userId: string,
  projectId: string,
  input: AddMemberInput,
) {
  await ensureProjectMembership({ userId, projectId, roles: ["ADMIN"] });
  const email = input.email.toLowerCase();

  const actor = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (input.role === "ADMIN" && actor?.role !== "ADMIN") {
    logger.warn("project.admin_invite_denied", { projectId, actorId: userId });
    throw new AppError("Only global admins can appoint admins", 403);
  }

  const target = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true },
  });

  if (!target) {
    const invitation = await createInvitation({
      email,
      role: input.role as Role,
      projectId,
      invitedById: userId,
    });

    return {
      kind: "invitation" as const,
      invitation,
    };
  }

  const member = await prisma.$transaction(async (tx) => {
    if (input.role === "ADMIN" && target.role !== "ADMIN") {
      await tx.user.update({
        where: { id: target.id },
        data: { role: "ADMIN" },
      });
    }

    return tx.projectMember.upsert({
      where: {
        projectId_userId: {
          projectId,
          userId: target.id,
        },
      },
      create: {
        projectId,
        userId: target.id,
        role: input.role as Role,
      },
      update: {
        role: input.role as Role,
      },
    });
  });

  logger.info("project.member_upserted", {
    actorId: userId,
    projectId,
    memberUserId: target.id,
    role: input.role,
  });
  return {
    kind: "member" as const,
    member,
  };
}

export async function softDeleteProject(userId: string, projectId: string) {
  await ensureProjectMembership({ userId, projectId, roles: ["ADMIN"] });

  const project = await prisma.project.update({
    where: { id: projectId },
    data: { deletedAt: new Date() },
  });

  logger.info("project.soft_deleted", { userId, projectId });
  return project;
}
