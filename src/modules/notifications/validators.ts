import { z } from "zod";

export const notificationUpdateSchema = z.object({
  ids: z.array(z.string()).optional(),
  read: z.boolean().default(true),
});
