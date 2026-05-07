import { z } from "zod";

export const adminRequestCreateSchema = z.object({
  message: z.string().max(500).optional().or(z.literal("")),
});

export const adminRequestReviewSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
});
