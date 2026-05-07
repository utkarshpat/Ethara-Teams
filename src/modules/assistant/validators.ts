import { z } from "zod";

export const assistantChatSchema = z.object({
  message: z.string().min(1).max(2000),
});
