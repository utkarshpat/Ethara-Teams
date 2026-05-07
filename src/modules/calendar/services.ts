import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/guards";
import { createGoogleMeetEvent } from "@/lib/google-calendar";
import { logger } from "@/lib/logger";
import { createNotification } from "@/modules/notifications/services";
import type {
  calendarEventCreateSchema,
  calendarEventRangeSchema,
  calendarEventUpdateSchema,
} from "@/modules/calendar/validators";
import type { z } from "zod";

type CalendarEventCreateInput = z.infer<typeof calendarEventCreateSchema>;
type CalendarEventUpdateInput = z.infer<typeof calendarEventUpdateSchema>;
type CalendarEventRangeInput = z.infer<typeof calendarEventRangeSchema>;

const REMINDER_LOOKAHEAD_DAYS = 14;
const REMINDER_GRACE_MS = 24 * 60 * 60 * 1000;

function assertValidRange(startAt: Date, endAt: Date) {
  if (endAt <= startAt) {
    throw new AppError("End time must be after start time", 422);
  }
}

function defaultRange(input: CalendarEventRangeInput) {
  const now = new Date();
  const from = input.from ? new Date(input.from) : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const to = input.to ? new Date(input.to) : new Date(now.getFullYear(), now.getMonth(), now.getDate() + 14, 23, 59, 59);
  return { from, to };
}

export async function listCalendarEvents(
  userId: string,
  input: CalendarEventRangeInput = {},
) {
  await deliverDueCalendarReminders(userId);
  const { from, to } = defaultRange(input);

  return prisma.calendarEvent.findMany({
    where: {
      userId,
      deletedAt: null,
      startAt: {
        gte: from,
        lte: to,
      },
    },
    orderBy: [{ startAt: "asc" }, { createdAt: "asc" }],
  });
}

export async function createCalendarEvent(
  userId: string,
  input: CalendarEventCreateInput,
) {
  const startAt = new Date(input.startAt);
  const endAt = new Date(input.endAt);
  assertValidRange(startAt, endAt);
  const meetEvent = input.createGoogleMeet
    ? await createGoogleMeetEvent({
        userId,
        title: input.title,
        notes: input.notes || null,
        startAt,
        endAt,
      })
    : null;

  const event = await prisma.calendarEvent.create({
    data: {
      userId,
      title: input.title,
      notes: input.notes || null,
      location: meetEvent?.meetUrl ?? (input.location || null),
      type: input.type,
      startAt,
      endAt,
      reminderMinutes: input.reminderMinutes ?? null,
    },
  });

  logger.info("calendar.event_created", {
    userId,
    eventId: event.id,
    startAt: event.startAt.toISOString(),
  });

  return event;
}

export async function updateCalendarEvent(
  userId: string,
  eventId: string,
  input: CalendarEventUpdateInput,
) {
  const existing = await prisma.calendarEvent.findFirst({
    where: { id: eventId, userId, deletedAt: null },
  });

  if (!existing) {
    throw new AppError("Calendar event not found", 404);
  }

  const startAt = input.startAt ? new Date(input.startAt) : existing.startAt;
  const endAt = input.endAt ? new Date(input.endAt) : existing.endAt;
  assertValidRange(startAt, endAt);

  const event = await prisma.calendarEvent.update({
    where: { id: eventId },
    data: {
      title: input.title,
      notes: input.notes === undefined ? undefined : input.notes || null,
      location:
        input.location === undefined ? undefined : input.location || null,
      type: input.type,
      status: input.status,
      startAt,
      endAt,
      reminderMinutes:
        input.reminderMinutes === undefined ? undefined : input.reminderMinutes,
      reminderSentAt:
        input.startAt !== undefined ||
        input.reminderMinutes !== undefined ||
        input.status === "SCHEDULED"
          ? null
          : undefined,
    },
  });

  logger.info("calendar.event_updated", {
    userId,
    eventId,
    status: event.status,
  });

  return event;
}

export async function softDeleteCalendarEvent(userId: string, eventId: string) {
  const existing = await prisma.calendarEvent.findFirst({
    where: { id: eventId, userId, deletedAt: null },
    select: { id: true },
  });

  if (!existing) {
    throw new AppError("Calendar event not found", 404);
  }

  const event = await prisma.calendarEvent.update({
    where: { id: eventId },
    data: { deletedAt: new Date() },
  });

  logger.info("calendar.event_deleted", { userId, eventId });
  return event;
}

export async function deliverDueCalendarReminders(userId: string) {
  const now = new Date();
  const maxStartAt = new Date(
    now.getTime() + REMINDER_LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000,
  );
  const minStartAt = new Date(now.getTime() - REMINDER_GRACE_MS);
  const events = await prisma.calendarEvent.findMany({
    where: {
      userId,
      status: "SCHEDULED",
      deletedAt: null,
      reminderSentAt: null,
      reminderMinutes: { not: null },
      startAt: {
        gte: minStartAt,
        lte: maxStartAt,
      },
    },
    orderBy: { startAt: "asc" },
  });

  const dueEvents = events.filter((event) => {
    const reminderMs = (event.reminderMinutes ?? 0) * 60_000;
    return event.startAt.getTime() - reminderMs <= now.getTime();
  });

  let delivered = 0;

  for (const event of dueEvents) {
    const result = await prisma.calendarEvent.updateMany({
      where: {
        id: event.id,
        userId,
        reminderSentAt: null,
      },
      data: {
        reminderSentAt: now,
      },
    });

    if (!result.count) {
      continue;
    }

    await createNotification({
      userId,
      type: "COMMENT",
      title: `Reminder: ${event.title}`,
      body: `${event.type.toLowerCase()} starts at ${event.startAt.toLocaleString()}`,
      link: "/dashboard/calendar",
    });
    delivered += 1;
  }

  if (delivered) {
    logger.info("calendar.reminders_delivered", { userId, delivered });
  }

  return { delivered };
}
