import type { Role } from "@prisma/client";
import { randomBytes } from "crypto";
import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const INVITATION_TTL_DAYS = 7;

type CreateInvitationInput = {
  email: string;
  role: Role;
  projectId?: string;
  invitedById: string;
};

function appUrl(path: string) {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return new URL(path, baseUrl).toString();
}

function token() {
  return randomBytes(32).toString("hex");
}

export async function createInvitation(input: CreateInvitationInput) {
  const email = input.email.toLowerCase();
  const expiresAt = new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);

  const invitation = await prisma.invitation.create({
    data: {
      email,
      role: input.role,
      projectId: input.projectId,
      invitedById: input.invitedById,
      token: token(),
      expiresAt,
    },
    include: {
      project: {
        select: {
          name: true,
        },
      },
      invitedBy: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  const registerUrl = appUrl(`/register?email=${encodeURIComponent(email)}`);
  const projectName = invitation.project?.name ?? "Ethara Teams";

  const delivery = await sendEmail({
    to: email,
    subject: `Invitation to ${projectName}`,
    text: `You have been invited to ${projectName} as ${input.role}. Create your account here: ${registerUrl}`,
    html: `<p>You have been invited to <strong>${projectName}</strong> as <strong>${input.role}</strong>.</p><p><a href="${registerUrl}">Create your Ethara Teams account</a></p>`,
  });

  logger.info("invitation.created", {
    invitationId: invitation.id,
    email,
    role: input.role,
    projectId: input.projectId,
    invitedById: input.invitedById,
  });

  return {
    ...invitation,
    emailSent: delivery.sent,
  };
}

export async function applyPendingInvitations(email: string, userId: string) {
  const normalizedEmail = email.toLowerCase();
  const invitations = await prisma.invitation.findMany({
    where: {
      email: normalizedEmail,
      acceptedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!invitations.length) {
    return { applied: 0, promoted: false };
  }

  const promoted = invitations.some((invitation) => invitation.role === "ADMIN");

  await prisma.$transaction(async (tx) => {
    if (promoted) {
      await tx.user.update({
        where: { id: userId },
        data: { role: "ADMIN" },
      });
    }

    await Promise.all(
      invitations
        .filter((invitation) => invitation.projectId)
        .map((invitation) =>
          tx.projectMember.upsert({
            where: {
              projectId_userId: {
                projectId: invitation.projectId as string,
                userId,
              },
            },
            create: {
              projectId: invitation.projectId as string,
              userId,
              role: invitation.role,
            },
            update: {
              role: invitation.role,
            },
          }),
        ),
    );

    await tx.invitation.updateMany({
      where: {
        id: {
          in: invitations.map((invitation) => invitation.id),
        },
      },
      data: {
        acceptedAt: new Date(),
      },
    });
  });

  logger.info("invitation.applied", {
    userId,
    email: normalizedEmail,
    count: invitations.length,
    promoted,
  });

  await Promise.all(
    invitations
      .filter((invitation) => invitation.projectId)
      .map((invitation) =>
        prisma.notification.create({
          data: {
            userId,
            type: "ASSIGNMENT",
            title: "Project invitation accepted",
            body: `You now have ${invitation.role} access to ${invitation.project?.name ?? "a project"}`,
            link: `/dashboard?projectId=${invitation.projectId}`,
          },
        }),
      ),
  );

  return { applied: invitations.length, promoted };
}
