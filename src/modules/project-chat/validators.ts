import { z } from "zod";

export const projectMessageCreateSchema = z.object({
  body: z.string().min(1).max(1600),
});
