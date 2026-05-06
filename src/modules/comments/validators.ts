import { z } from "zod";

export const commentCreateSchema = z.object({
  body: z.string().min(1).max(1200),
});
