import { NextResponse } from "next/server";
import { apiError, requireApiUser } from "@/lib/api";
import {
  listNotifications,
  notificationUpdateSchema,
  setNotificationsRead,
} from "@/modules/notifications";

export async function GET() {
  try {
    const user = await requireApiUser();
    const notifications = await listNotifications(user.id);
    return NextResponse.json(notifications);
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireApiUser();
    const input = notificationUpdateSchema.parse(await request.json());
    const result = await setNotificationsRead(user.id, input.ids, input.read);
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error);
  }
}
