import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2).max(80),
  username: z
    .string()
    .min(3)
    .max(32)
    .regex(/^[a-zA-Z0-9._-]+$/),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});
