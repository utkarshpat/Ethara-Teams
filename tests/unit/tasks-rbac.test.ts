import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    task: {
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@/lib/realtime-bus", () => ({
  triggerProjectEvent: vi.fn(),
}));

vi.mock("@/modules/notifications/services", () => ({
  createNotification: vi.fn(),
}));

vi.mock("@/lib/guards", () => {
  class AppError extends Error {
    constructor(
      message: string,
      public status = 400,
    ) {
      super(message);
    }
  }

  return {
    AppError,
    canMutateTask: vi.fn((userId: string, assignedToId: string | null, role: string) =>
      role === "ADMIN" || assignedToId === userId,
    ),
    ensureProjectMembership: vi.fn(),
    ensureTaskAccess: vi.fn(),
  };
});

import {
  AppError,
  ensureProjectMembership,
  ensureTaskAccess,
} from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { triggerProjectEvent } from "@/lib/realtime-bus";
import { createNotification } from "@/modules/notifications/services";
import { updateTask } from "@/modules/tasks/services";

const db = vi.mocked(prisma, true);
const guard = vi.mocked(ensureTaskAccess);
const membershipGuard = vi.mocked(ensureProjectMembership);
const emitProjectEvent = vi.mocked(triggerProjectEvent);
const notify = vi.mocked(createNotification);

describe("task RBAC service rules", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows an assigned member to update task progress", async () => {
    guard.mockResolvedValue({
      task: {
        id: "task-1",
        projectId: "project-1",
        assignedToId: "member-1",
        status: "TODO",
        deletedAt: null,
      },
      membership: {
        effectiveRole: "MEMBER",
      },
    } as Awaited<ReturnType<typeof ensureTaskAccess>>);
    db.task.update.mockResolvedValue({
      id: "task-1",
      projectId: "project-1",
      assignedToId: "member-1",
      title: "Review task",
      status: "DONE",
    });

    await expect(
      updateTask("member-1", "task-1", { status: "DONE", order: 2 }),
    ).resolves.toMatchObject({ status: "DONE" });

    expect(db.task.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "task-1" },
        data: expect.objectContaining({ status: "DONE", order: 2 }),
      }),
    );
    expect(emitProjectEvent).toHaveBeenCalledWith(
      "project-1",
      "task:status_changed",
      expect.objectContaining({ id: "task-1" }),
    );
    expect(notify).not.toHaveBeenCalled();
  });

  it("blocks members from changing task details or assignments", async () => {
    guard.mockResolvedValue({
      task: {
        id: "task-1",
        projectId: "project-1",
        assignedToId: "member-1",
        status: "TODO",
        deletedAt: null,
      },
      membership: {
        effectiveRole: "MEMBER",
      },
    } as Awaited<ReturnType<typeof ensureTaskAccess>>);

    await expect(
      updateTask("member-1", "task-1", { assignedToId: "member-2" }),
    ).rejects.toMatchObject({
      message: "Only admins can edit task details or assignments",
      status: 403,
    });

    expect(db.task.update).not.toHaveBeenCalled();
  });

  it("allows admins to reassign a task and notifies the new assignee", async () => {
    guard.mockResolvedValue({
      task: {
        id: "task-1",
        projectId: "project-1",
        assignedToId: "member-1",
        status: "TODO",
        deletedAt: null,
      },
      membership: {
        effectiveRole: "ADMIN",
      },
    } as Awaited<ReturnType<typeof ensureTaskAccess>>);
    membershipGuard.mockResolvedValue({ effectiveRole: "MEMBER" } as never);
    db.task.update.mockResolvedValue({
      id: "task-1",
      projectId: "project-1",
      assignedToId: "member-2",
      title: "Review task",
      status: "TODO",
    });

    await updateTask("admin-1", "task-1", { assignedToId: "member-2" });

    expect(membershipGuard).toHaveBeenCalledWith({
      userId: "member-2",
      projectId: "project-1",
    });
    expect(notify).toHaveBeenCalledWith({
      userId: "member-2",
      type: "ASSIGNMENT",
      title: "Task assignment updated",
      body: "Review task",
      link: "/dashboard?projectId=project-1&taskId=task-1",
    });
  });

  it("keeps non-assigned members out of task updates", async () => {
    guard.mockResolvedValue({
      task: {
        id: "task-1",
        projectId: "project-1",
        assignedToId: "member-2",
        status: "TODO",
        deletedAt: null,
      },
      membership: {
        effectiveRole: "MEMBER",
      },
    } as Awaited<ReturnType<typeof ensureTaskAccess>>);

    await expect(
      updateTask("member-1", "task-1", { status: "DONE" }),
    ).rejects.toBeInstanceOf(AppError);
  });
});
