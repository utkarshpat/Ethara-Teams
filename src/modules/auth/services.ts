import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/guards";
import { logger } from "@/lib/logger";
import type { registerSchema } from "@/modules/auth/validators";
import type { z } from "zod";

type RegisterInput = z.infer<typeof registerSchema>;

export async function registerUser(input: RegisterInput) {
  const email = input.email.toLowerCase();
  const username = input.username.toLowerCase();

  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { username }],
    },
    select: { id: true },
  });

  if (existing) {
    logger.warn("auth.register_duplicate", { email, username });
    throw new AppError("Email or username already exists", 409);
  }

  const userCount = await prisma.user.count();
  const passwordHash = await hash(input.password, 12);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email,
      username,
      passwordHash,
      role: userCount === 0 ? "ADMIN" : "MEMBER",
    },
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      role: true,
    },
  });

  logger.info("auth.register_success", { userId: user.id, role: user.role });
  return user;
}
