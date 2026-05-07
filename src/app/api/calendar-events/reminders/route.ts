import { NextResponse } from "next/server";
import { apiError, requireApiUser } from "@/lib/api";
import { deliverDueCalendarReminders } from "@/modules/calendar";

export async function POST() {
  try {
    const user = await requireApiUser();
    const result = await deliverDueCalendarReminders(user.id);
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error);
  }
}

