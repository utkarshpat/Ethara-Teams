import { hash } from "bcryptjs";
import { randomBytes } from "crypto";
import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/guards";
import { logger } from "@/lib/logger";
import type { registerSchema } from "@/modules/auth/validators";
import type { z } from "zod";

type RegisterInput = z.infer<typeof registerSchema>;

function appUrl(path: string) {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return new URL(path, baseUrl).toString();
}

function verificationToken() {
  return randomBytes(32).toString("hex");
}

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
  const isBootstrapAdmin = userCount === 0;

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email,
      username,
      passwordHash,
      role: isBootstrapAdmin ? "ADMIN" : "MEMBER",
      emailVerified: isBootstrapAdmin ? new Date() : null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      role: true,
      emailVerified: true,
    },
  });

  let verificationUrl: string | undefined;

  if (!isBootstrapAdmin) {
    const token = verificationToken();
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24);
    verificationUrl = appUrl(
      `/api/auth/verify-email?email=${encodeURIComponent(email)}&token=${token}`,
    );

    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires,
      },
    });

    await sendEmail({
      to: email,
      subject: "Verify your Ethara Teams account",
      text: `Verify your Ethara Teams account: ${verificationUrl}`,
      html: `<p>Verify your Ethara Teams account to start collaborating.</p><p><a href="${verificationUrl}">Verify email</a></p>`,
    });
  }

  logger.info("auth.register_success", {
    userId: user.id,
    role: user.role,
    requiresEmailVerification: !user.emailVerified,
  });

  return {
    ...user,
    requiresEmailVerification: !user.emailVerified,
    verificationUrl:
      process.env.NODE_ENV === "production" ? undefined : verificationUrl,
  };
}

export async function verifyEmail(email: string, token: string) {
  const normalizedEmail = email.toLowerCase();
  const record = await prisma.verificationToken.findUnique({
    where: { token },
  });

  if (
    !record ||
    record.identifier.toLowerCase() !== normalizedEmail ||
    record.expires < new Date()
  ) {
    logger.warn("auth.email_verify_invalid", { email: normalizedEmail });
    throw new AppError("Invalid or expired verification link", 400);
  }

  const user = await prisma.user.update({
    where: { email: normalizedEmail },
    data: { emailVerified: new Date() },
    select: { id: true, email: true },
  });

  await prisma.verificationToken.deleteMany({
    where: { identifier: normalizedEmail },
  });

  logger.info("auth.email_verified", {
    userId: user.id,
    email: normalizedEmail,
  });

  return user;
}
