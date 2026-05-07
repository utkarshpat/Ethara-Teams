import { prisma } from "@/lib/prisma";
import { AppError, ensureProjectMembership } from "@/lib/guards";
import { logger } from "@/lib/logger";
import { createNotification } from "@/modules/notifications/services";
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
  await createNotification({
    userId,
    type: "COMMENT",
    title: "Project created",
    body: project.name,
    link: `/dashboard?projectId=${project.id}`,
  });
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
    select: { id: true, name: true, email: true, role: true },
  });

  if (!target) {
    logger.info("project.member_missing_manual_mail_required", {
      actorId: userId,
      projectId,
      email,
      role: input.role,
    });
    throw new AppError("User not found. Open a manual email draft and ask them to sign up first.", 404);
  }

  const member = await prisma.$transaction(async (tx) => {
    if (input.role === "ADMIN" && target.role !== "ADMIN") {
      await tx.user.update({
        where: { id: target.id },
        data: { role: "ADMIN" },
      });
    }

    if (input.role === "MEMBER" && target.role === "ADMIN") {
      if (actor?.role !== "ADMIN") {
        logger.warn("project.admin_demote_denied", { projectId, actorId: userId });
        throw new AppError("Only global admins can demote admins", 403);
      }

      if (target.id === userId) {
        throw new AppError("You cannot demote yourself", 400);
      }

      const adminCount = await tx.user.count({
        where: { role: "ADMIN" },
      });

      if (adminCount <= 1) {
        throw new AppError("At least one global admin is required", 400);
      }

      await tx.user.update({
        where: { id: target.id },
        data: { role: "MEMBER" },
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
        role: input.role,
      },
      update: {
        role: input.role,
      },
    });
  });

  logger.info("project.member_upserted", {
    actorId: userId,
    projectId,
    memberUserId: target.id,
    role: input.role,
  });
  await createNotification({
    userId: target.id,
    type: "ASSIGNMENT",
    title: input.role === "ADMIN" ? "Admin access updated" : "Team role updated",
    body: `You now have ${input.role} access`,
    link: `/dashboard?projectId=${projectId}`,
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
