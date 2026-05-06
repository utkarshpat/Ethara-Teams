import { NextResponse } from "next/server";
import { apiError, requireApiUser } from "@/lib/api";
import {
  calendarEventCreateSchema,
  calendarEventRangeSchema,
  createCalendarEvent,
  listCalendarEvents,
} from "@/modules/calendar";

function serializeCalendarEvent(
  event: Awaited<ReturnType<typeof listCalendarEvents>>[number],
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

export async function GET(request: Request) {
  try {
    const user = await requireApiUser();
    const url = new URL(request.url);
    const range = calendarEventRangeSchema.parse({
      from: url.searchParams.get("from") ?? undefined,
      to: url.searchParams.get("to") ?? undefined,
    });
    const events = await listCalendarEvents(user.id, range);
    return NextResponse.json(events.map(serializeCalendarEvent));
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const input = calendarEventCreateSchema.parse(await request.json());
    const event = await createCalendarEvent(user.id, input);
    return NextResponse.json(serializeCalendarEvent(event), { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
