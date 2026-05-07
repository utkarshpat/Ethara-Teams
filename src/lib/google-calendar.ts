import { randomUUID } from "crypto";
import { AppError } from "@/lib/guards";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

type GoogleCalendarEventInput = {
  userId: string;
  title: string;
  notes?: string | null;
  startAt: Date;
  endAt: Date;
};

type GoogleTokenResponse = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  error?: string;
  error_description?: string;
};

type GoogleCalendarInsertResponse = {
  id?: string;
  htmlLink?: string;
  hangoutLink?: string;
  conferenceData?: {
    entryPoints?: Array<{
      entryPointType?: string;
      uri?: string;
    }>;
  };
};

async function getGoogleAccessToken(userId: string) {
  const account = await prisma.account.findFirst({
    where: {
      userId,
      provider: "google",
    },
    select: {
      id: true,
      access_token: true,
      refresh_token: true,
      expires_at: true,
      scope: true,
    },
  });

  if (!account) {
    throw new AppError("Connect Google login before creating Google Meet links", 400);
  }

  if (!account.scope?.includes("calendar.events")) {
    throw new AppError("Google Calendar permission is missing. Sign in with Google again.", 400);
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (account.access_token && account.expires_at && account.expires_at > nowSeconds + 60) {
    return account.access_token;
  }

  if (!account.refresh_token) {
    throw new AppError("Google session cannot refresh Calendar access. Sign in with Google again.", 400);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new AppError("Google Calendar integration is not configured", 500);
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: account.refresh_token,
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as GoogleTokenResponse;

  if (!response.ok || !payload.access_token) {
    logger.error("google_calendar.token_refresh_failed", {
      userId,
      status: response.status,
      error: payload.error,
      description: payload.error_description,
    });
    throw new AppError("Could not refresh Google Calendar access", 400);
  }

  await prisma.account.update({
    where: { id: account.id },
    data: {
      access_token: payload.access_token,
      expires_at: payload.expires_in
        ? Math.floor(Date.now() / 1000) + payload.expires_in
        : account.expires_at,
      refresh_token: payload.refresh_token ?? account.refresh_token,
    },
  });

  return payload.access_token;
}

export async function createGoogleMeetEvent(input: GoogleCalendarEventInput) {
  const accessToken = await getGoogleAccessToken(input.userId);

  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: input.title,
        description: input.notes ?? undefined,
        start: {
          dateTime: input.startAt.toISOString(),
        },
        end: {
          dateTime: input.endAt.toISOString(),
        },
        conferenceData: {
          createRequest: {
            requestId: randomUUID(),
          },
        },
      }),
    },
  );

  const payload = (await response.json().catch(() => ({}))) as GoogleCalendarInsertResponse;

  if (!response.ok) {
    logger.error("google_calendar.event_create_failed", {
      userId: input.userId,
      status: response.status,
      payload,
    });
    throw new AppError("Could not create Google Meet event", 400);
  }

  const meetUrl =
    payload.conferenceData?.entryPoints?.find(
      (entry) => entry.entryPointType === "video" && entry.uri,
    )?.uri ?? payload.hangoutLink ?? null;

  logger.info("google_calendar.event_created", {
    userId: input.userId,
    googleEventId: payload.id,
    hasMeetUrl: Boolean(meetUrl),
  });

  return {
    googleEventId: payload.id ?? null,
    calendarUrl: payload.htmlLink ?? null,
    meetUrl,
  };
}
