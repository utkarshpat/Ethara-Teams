import type { AdminRequestStatus } from "@prisma/client";
import { sendEmail } from "@/lib/email";
import { AppError } from "@/lib/guards";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/modules/notifications/services";
import type {
  adminRequestCreateSchema,
  adminRequestReviewSchema,
} from "@/modules/admin-requests/validators";
import type { z } from "zod";

type AdminRequestCreateInput = z.infer<typeof adminRequestCreateSchema>;
type AdminRequestReviewInput = z.infer<typeof adminRequestReviewSchema>;

const adminRequestInclude = {
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      image: true,
      role: true,
    },
  },
  reviewedBy: {
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      image: true,
      role: true,
    },
  },
} as const;

function appUrl(path: string) {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return new URL(path, baseUrl).toString();
}

async function ensureGlobalAdmin(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (user?.role !== "ADMIN") {
    throw new AppError("Only admins can review admin requests", 403);
  }
}

export async function listAdminRequests(userId: string) {
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  const where =
    currentUser?.role === "ADMIN"
      ? {}
      : {
          userId,
        };

  return prisma.adminRequest.findMany({
    where,
    include: adminRequestInclude,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: currentUser?.role === "ADMIN" ? 50 : 10,
  });
}

export async function createAdminRequest(
  userId: string,
  input: AdminRequestCreateInput,
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (user.role === "ADMIN") {
    throw new AppError("You are already an admin", 400);
  }

  const existing = await prisma.adminRequest.findFirst({
    where: {
      userId,
      status: "PENDING",
    },
  });

  if (existing) {
    throw new AppError("Admin request is already pending", 409);
  }

  const request = await prisma.adminRequest.create({
    data: {
      userId,
      message: input.message || null,
    },
    include: adminRequestInclude,
  });

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", email: { not: null } },
    select: { id: true, email: true },
  });

  await Promise.all(
    admins.map(async (admin) => {
      await createNotification({
        userId: admin.id,
        type: "COMMENT",
        title: "Admin access requested",
        body: `${user.name ?? user.email ?? "A teammate"} requested admin access.`,
        link: "/dashboard/team",
      });

      if (!admin.email) {
        return;
      }

      await sendEmail({
        to: admin.email,
        subject: "Admin access request",
        text: `${user.name ?? user.email} requested admin access. Review it here: ${appUrl("/dashboard/team")}`,
        html: `<p><strong>${user.name ?? user.email}</strong> requested admin access.</p><p><a href="${appUrl("/dashboard/team")}">Review request</a></p>`,
      });
    }),
  );

  logger.info("admin_request.created", { userId, requestId: request.id });
  return request;
}

export async function reviewAdminRequest(
  reviewerId: string,
  requestId: string,
  input: AdminRequestReviewInput,
) {
  await ensureGlobalAdmin(reviewerId);

  const existing = await prisma.adminRequest.findUnique({
    where: { id: requestId },
    include: adminRequestInclude,
  });

  if (!existing) {
    throw new AppError("Admin request not found", 404);
  }

  if (existing.status !== "PENDING") {
    throw new AppError("Admin request was already reviewed", 400);
  }

  const request = await prisma.$transaction(async (tx) => {
    if (input.status === "APPROVED") {
      await tx.user.update({
        where: { id: existing.userId },
        data: { role: "ADMIN" },
      });
    }

    return tx.adminRequest.update({
      where: { id: requestId },
      data: {
        status: input.status as AdminRequestStatus,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
      },
      include: adminRequestInclude,
    });
  });

  const approved = input.status === "APPROVED";
  await createNotification({
    userId: existing.userId,
    type: "COMMENT",
    title: approved ? "Admin request approved" : "Admin request rejected",
    body: approved
      ? "You can now manage projects, members, and admin invitations."
      : "Your admin request was not approved.",
    link: "/dashboard/team",
  });

  if (existing.user.email) {
    await sendEmail({
      to: existing.user.email,
      subject: approved
        ? "Your Ethara Teams admin request was approved"
        : "Your Ethara Teams admin request was rejected",
      text: approved
        ? `Your admin request was approved. Open Ethara Teams: ${appUrl("/dashboard")}`
        : `Your admin request was rejected. Open Ethara Teams: ${appUrl("/dashboard")}`,
      html: approved
        ? `<p>Your admin request was approved.</p><p><a href="${appUrl("/dashboard")}">Open Ethara Teams</a></p>`
        : `<p>Your admin request was rejected.</p><p><a href="${appUrl("/dashboard")}">Open Ethara Teams</a></p>`,
    });
  }

  logger.info("admin_request.reviewed", {
    reviewerId,
    requestId,
    status: input.status,
  });
  return request;
}
