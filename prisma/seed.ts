import { Prisma, PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const projectName = "Product Operations";
const projectDescription =
  "Central workspace for product delivery, ownership, and cross-functional execution.";

async function main() {
  const passwordHash = await hash("Password@123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@ethara.dev" },
    update: {
      name: "Aarav Admin",
      username: "aarav",
      passwordHash,
      role: "ADMIN",
    },
    create: {
      name: "Aarav Admin",
      username: "aarav",
      email: "admin@ethara.dev",
      passwordHash,
      role: "ADMIN",
    },
  });

  const member = await prisma.user.upsert({
    where: { email: "member@ethara.dev" },
    update: {
      name: "Mira Member",
      username: "mira",
      passwordHash,
      role: "MEMBER",
    },
    create: {
      name: "Mira Member",
      username: "mira",
      email: "member@ethara.dev",
      passwordHash,
      role: "MEMBER",
    },
  });

  const project = await prisma.project.upsert({
    where: { id: "seed-project-ethara" },
    update: {
      name: projectName,
      description: projectDescription,
      ownerId: admin.id,
      deletedAt: null,
    },
    create: {
      id: "seed-project-ethara",
      name: projectName,
      description: projectDescription,
      ownerId: admin.id,
      members: {
        create: [
          { userId: admin.id, role: "ADMIN" },
          { userId: member.id, role: "MEMBER" },
        ],
      },
    },
  });

  await Promise.all([
    prisma.projectMember.upsert({
      where: {
        projectId_userId: {
          projectId: project.id,
          userId: admin.id,
        },
      },
      update: { role: "ADMIN" },
      create: {
        projectId: project.id,
        userId: admin.id,
        role: "ADMIN",
      },
    }),
    prisma.projectMember.upsert({
      where: {
        projectId_userId: {
          projectId: project.id,
          userId: member.id,
        },
      },
      update: { role: "MEMBER" },
      create: {
        projectId: project.id,
        userId: member.id,
        role: "MEMBER",
      },
    }),
  ]);

  const tasks = [
      {
        id: "seed-task-dashboard",
        title: "Review operations dashboard",
        description: "Validate status, priority, and overdue summaries for weekly planning.",
        projectId: project.id,
        assignedToId: admin.id,
        priority: "HIGH",
        status: "IN_PROGRESS",
        order: 0,
        dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2),
      },
      {
        id: "seed-task-chat",
        title: "Coordinate client handoff",
        description: "Use task comments, mentions, and references to align the handoff owner.",
        projectId: project.id,
        assignedToId: member.id,
        priority: "URGENT",
        status: "TODO",
        order: 0,
        dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24),
      },
      {
        id: "seed-task-deploy",
        title: "Resolve release blockers",
        description: "Confirm environment readiness, database health, and release ownership.",
        projectId: project.id,
        assignedToId: admin.id,
        priority: "MEDIUM",
        status: "REVIEW",
        order: 0,
        dueDate: new Date(Date.now() - 1000 * 60 * 60 * 24),
      },
    ] satisfies Prisma.TaskUncheckedCreateInput[];

  await Promise.all(
    tasks.map((task) =>
      prisma.task.upsert({
        where: { id: task.id },
        update: {
          title: task.title,
          description: task.description,
          projectId: task.projectId,
          assignedToId: task.assignedToId,
          priority: task.priority,
          status: task.status,
          order: task.order,
          dueDate: task.dueDate,
          deletedAt: null,
        },
        create: task,
      }),
    ),
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
