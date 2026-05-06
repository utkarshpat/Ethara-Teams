import { ensureProjectMembership } from "@/lib/guards";
import {
  extractMentionKeys,
  extractTaskRefs,
  slugifyTaskTitle,
} from "@/lib/content-references";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { triggerProjectEvent } from "@/lib/realtime-bus";
import { createNotification } from "@/modules/notifications/services";
import type { projectMessageCreateSchema } from "@/modules/project-chat/validators";
import type { z } from "zod";

type ProjectMessageCreateInput = z.infer<typeof projectMessageCreateSchema>;

const projectMessageInclude = {
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
} as const;

async function hydrateProjectMessages<
  T extends Array<{
    id: string;
    body: string;
    projectId: string;
  }>,
>(messages: T) {
  const refs = [...new Set(messages.flatMap((message) => extractTaskRefs(message.body)))];

  if (!refs.length) {
    return messages.map((message) => ({ ...message, referencedTasks: [] }));
  }

  const tasks = await prisma.task.findMany({
    where: {
      projectId: { in: [...new Set(messages.map((message) => message.projectId))] },
      deletedAt: null,
    },
    select: {
      id: true,
      title: true,
      status: true,
      projectId: true,
    },
  });

  return messages.map((message) => {
    const messageRefs = new Set(extractTaskRefs(message.body));
    const referencedTasks = tasks
      .filter(
        (task) =>
          task.projectId === message.projectId &&
          (messageRefs.has(task.id.toLowerCase()) ||
            messageRefs.has(slugifyTaskTitle(task.title))),
      )
      .map((task) => ({
        id: task.id,
        title: task.title,
        status: task.status,
      }));

    return { ...message, referencedTasks };
  });
}

export async function listProjectMessages(userId: string, projectId: string) {
  await ensureProjectMembership({ userId, projectId });

  const messages = await prisma.projectMessage.findMany({
    where: { projectId },
    include: projectMessageInclude,
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  return hydrateProjectMessages(messages);
}

export async function createProjectMessage(
  userId: string,
  projectId: string,
  input: ProjectMessageCreateInput,
) {
  await ensureProjectMembership({ userId, projectId });

  const message = await prisma.projectMessage.create({
    data: {
      body: input.body,
      projectId,
      userId,
    },
    include: projectMessageInclude,
  });

  const mentionKeys = [...new Set(extractMentionKeys(input.body))];

  if (mentionKeys.length) {
    const mentionedUsers = await prisma.user.findMany({
      where: {
        OR: [{ username: { in: mentionKeys } }, { email: { in: mentionKeys } }],
        memberships: {
          some: {
            projectId,
          },
        },
      },
      select: {
        id: true,
      },
    });

    await Promise.all(
      mentionedUsers
        .filter((mentionedUser) => mentionedUser.id !== userId)
        .map((mentionedUser) =>
          createNotification({
            userId: mentionedUser.id,
            type: "MENTION",
            title: "Project mention",
            body: message.body,
            link: `/dashboard?projectId=${projectId}`,
          }),
        ),
    );
  }

  const [hydratedMessage] = await hydrateProjectMessages([message]);

  await triggerProjectEvent(projectId, "project:message_created", hydratedMessage);

  logger.info("project_message.created", {
    userId,
    projectId,
    messageId: message.id,
    mentionCount: mentionKeys.length,
    taskRefCount: hydratedMessage?.referencedTasks.length ?? 0,
  });

  return hydratedMessage;
}
