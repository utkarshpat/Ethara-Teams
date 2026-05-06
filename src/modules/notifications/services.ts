import type { NotificationType } from "@prisma/client";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

type CreateNotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string | null;
};

export async function createNotification(input: CreateNotificationInput) {
  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      link: input.link,
    },
  });

  logger.info("notification.created", {
    notificationId: notification.id,
    userId: input.userId,
    type: input.type,
  });
  return notification;
}

export async function listNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
}

export async function setNotificationsRead(
  userId: string,
  ids: string[] | undefined,
  read: boolean,
) {
  const result = await prisma.notification.updateMany({
    where: {
      userId,
      ...(ids?.length ? { id: { in: ids } } : {}),
    },
    data: { read },
  });

  logger.info("notification.read_state_updated", {
    userId,
    count: result.count,
    read,
  });
  return result;
}
