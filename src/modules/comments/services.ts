import { prisma } from "@/lib/prisma";
import { ensureTaskAccess } from "@/lib/guards";
import {
  extractMentionKeys,
  extractTaskRefs,
  slugifyTaskTitle,
} from "@/lib/content-references";
import { logger } from "@/lib/logger";
import { triggerProjectEvent, triggerTaskEvent } from "@/lib/realtime-bus";
import { createNotification } from "@/modules/notifications/services";
import type { commentCreateSchema } from "@/modules/comments/validators";
import type { z } from "zod";

type CommentCreateInput = z.infer<typeof commentCreateSchema>;

const commentInclude = {
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

async function hydrateComments<
  T extends Array<{
    body: string;
    taskId: string;
  }>,
>(comments: T, projectId: string) {
  const refs = [...new Set(comments.flatMap((comment) => extractTaskRefs(comment.body)))];

  if (!refs.length) {
    return comments.map((comment) => ({ ...comment, referencedTasks: [] }));
  }

  const tasks = await prisma.task.findMany({
    where: {
      projectId,
      deletedAt: null,
    },
    select: {
      id: true,
      title: true,
      status: true,
    },
  });

  return comments.map((comment) => {
    const commentRefs = new Set(extractTaskRefs(comment.body));
    const referencedTasks = tasks.filter(
      (task) =>
        commentRefs.has(task.id.toLowerCase()) ||
        commentRefs.has(slugifyTaskTitle(task.title)),
    );

    return { ...comment, referencedTasks };
  });
}

export async function listTaskComments(userId: string, taskId: string) {
  const { task } = await ensureTaskAccess(userId, taskId);

  const comments = await prisma.comment.findMany({
    where: { taskId },
    include: commentInclude,
    orderBy: { createdAt: "asc" },
  });

  return hydrateComments(comments, task.projectId);
}

export async function createTaskComment(
  userId: string,
  taskId: string,
  input: CommentCreateInput,
) {
  const { task } = await ensureTaskAccess(userId, taskId);

  const comment = await prisma.comment.create({
    data: {
      body: input.body,
      taskId,
      userId,
    },
    include: commentInclude,
  });

  const mentionKeys = [...new Set(extractMentionKeys(input.body))];

  if (mentionKeys.length) {
    const mentionedUsers = await prisma.user.findMany({
      where: {
        OR: [
          { username: { in: mentionKeys } },
          { email: { in: mentionKeys } },
        ],
        memberships: {
          some: {
            projectId: task.projectId,
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
            title: "You were mentioned",
            body: comment.body,
            link: `/dashboard?projectId=${task.projectId}&taskId=${taskId}`,
          }),
        ),
    );
  }

  await triggerTaskEvent(taskId, "comment:created", comment);
  await triggerProjectEvent(task.projectId, "comment:created", {
    taskId,
    commentId: comment.id,
  });

  logger.info("comment.created", {
    userId,
    taskId,
    projectId: task.projectId,
    commentId: comment.id,
    mentionCount: mentionKeys.length,
  });
  const [hydratedComment] = await hydrateComments([comment], task.projectId);
  return hydratedComment;
}
