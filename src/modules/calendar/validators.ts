import { z } from "zod";

export const calendarEventCreateSchema = z.object({
  title: z.string().min(2).max(160),
  notes: z.string().max(1200).optional().or(z.literal("")),
  location: z.string().max(180).optional().or(z.literal("")),
  type: z.enum(["MEETING", "EVENT", "REMINDER", "FOCUS"]).default("EVENT"),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  reminderMinutes: z.number().int().min(0).max(10080).optional().nullable(),
  createGoogleMeet: z.boolean().optional().default(false),
});

export const calendarEventUpdateSchema = calendarEventCreateSchema
  .partial()
  .extend({
    status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED"]).optional(),
  });

export const calendarEventRangeSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});
