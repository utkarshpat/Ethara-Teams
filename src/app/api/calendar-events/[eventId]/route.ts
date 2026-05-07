import { NextResponse } from "next/server";
import { apiError, requireApiUser } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  calendarEventUpdateSchema,
  softDeleteCalendarEvent,
  updateCalendarEvent,
} from "@/modules/calendar";

type CalendarEventRouteContext = {
  params: Promise<{
    eventId: string;
  }>;
};

function serializeCalendarEvent(
  event: Awaited<ReturnType<typeof updateCalendarEvent>>,
) {
  return {
    id: event.id,
    title: event.title,
    notes: event.notes,
    location: event.location,
    type: event.type,
    status: event.status,
    startAt: event.startAt.toISOString(),
    endAt: event.endAt.toISOString(),
    reminderMinutes: event.reminderMinutes,
    userId: event.userId,
  };
}

export async function PATCH(
  request: Request,
  context: CalendarEventRouteContext,
) {
  try {
    const user = await requireApiUser();
    enforceRateLimit(request, {
      scope: "calendar:update",
      userId: user.id,
      limit: 60,
      windowMs: 60_000,
    });
    const { eventId } = await context.params;
    const input = calendarEventUpdateSchema.parse(await request.json());
    const event = await updateCalendarEvent(user.id, eventId, input);
    return NextResponse.json(serializeCalendarEvent(event));
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(
  request: Request,
  context: CalendarEventRouteContext,
) {
  try {
    const user = await requireApiUser();
    enforceRateLimit(request, {
      scope: "calendar:delete",
      userId: user.id,
      limit: 30,
      windowMs: 60_000,
    });
    const { eventId } = await context.params;
    const event = await softDeleteCalendarEvent(user.id, eventId);
    return NextResponse.json(serializeCalendarEvent(event));
  } catch (error) {
    return apiError(error);
  }
}
