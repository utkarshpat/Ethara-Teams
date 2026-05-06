import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    projectMember: {
      findUnique: vi.fn(),
    },
    task: {
      findUnique: vi.fn(),
    },
  },
}));

import {
  AppError,
  canMutateTask,
  ensureProjectMembership,
  ensureTaskAccess,
} from "@/lib/guards";
import { prisma } from "@/lib/prisma";

const db = vi.mocked(prisma, true);

describe("workspace guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an effective admin role when the user is a global admin", async () => {
    db.projectMember.findUnique.mockResolvedValue({
      id: "membership-1",
      projectId: "project-1",
      userId: "user-1",
      role: "MEMBER",
      createdAt: new Date(),
      project: { id: "project-1", deletedAt: null },
      user: { role: "ADMIN" },
    });

    await expect(
      ensureProjectMembership({
        userId: "user-1",
        projectId: "project-1",
        roles: ["ADMIN"],
      }),
    ).resolves.toMatchObject({ effectiveRole: "ADMIN" });
  });

  it("rejects missing or soft-deleted project membership", async () => {
    db.projectMember.findUnique.mockResolvedValue(null);

    await expect(
      ensureProjectMembership({ userId: "user-1", projectId: "project-1" }),
    ).rejects.toMatchObject({ message: "Project access denied", status: 403 });

    db.projectMember.findUnique.mockResolvedValue({
      id: "membership-1",
      projectId: "project-1",
      userId: "user-1",
      role: "ADMIN",
      createdAt: new Date(),
      project: { id: "project-1", deletedAt: new Date() },
      user: { role: "ADMIN" },
    });

    await expect(
      ensureProjectMembership({ userId: "user-1", projectId: "project-1" }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("rejects role-gated operations for members", async () => {
    db.projectMember.findUnique.mockResolvedValue({
      id: "membership-1",
      projectId: "project-1",
      userId: "user-1",
      role: "MEMBER",
      createdAt: new Date(),
      project: { id: "project-1", deletedAt: null },
      user: { role: "MEMBER" },
    });

    await expect(
      ensureProjectMembership({
        userId: "user-1",
        projectId: "project-1",
        roles: ["ADMIN"],
      }),
    ).rejects.toMatchObject({
      message: "Insufficient permissions",
      status: 403,
    });
  });

  it("rejects missing or soft-deleted tasks", async () => {
    db.task.findUnique.mockResolvedValue(null);

    await expect(ensureTaskAccess("user-1", "task-1")).rejects.toMatchObject({
      message: "Task not found",
      status: 404,
    });

    db.task.findUnique.mockResolvedValue({
      id: "task-1",
      projectId: "project-1",
      assignedToId: "user-1",
      status: "TODO",
      deletedAt: new Date(),
    });

    await expect(ensureTaskAccess("user-1", "task-1")).rejects.toMatchObject({
      message: "Task not found",
      status: 404,
    });
  });

  it("allows admins and assigned members to mutate task progress", () => {
    expect(canMutateTask("admin-1", null, "ADMIN")).toBe(true);
    expect(canMutateTask("member-1", "member-1", "MEMBER")).toBe(true);
    expect(canMutateTask("member-1", "member-2", "MEMBER")).toBe(false);
  });
});
