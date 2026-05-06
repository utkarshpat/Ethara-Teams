import { z } from "zod";

export const projectCreateSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional().or(z.literal("")),
});

export const projectUpdateSchema = projectCreateSchema.partial();

export const addMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
});
