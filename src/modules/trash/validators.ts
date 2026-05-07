import { z } from "zod";

export const trashRestoreSchema = z.object({
  type: z.enum(["project", "task"]),
  id: z.string().min(1),
});
