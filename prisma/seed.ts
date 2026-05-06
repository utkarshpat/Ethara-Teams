import { Prisma, PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const projectName = "Product Operations";
const projectDescription =
  "Central workspace for product delivery, ownership, and cross-functional execution.";

const demoUsers = [
  {
    email: "manager1@ethara.dev",
    username: "manager1",
    name: "Aarav Manager",
    role: "ADMIN",
  },
  {
    email: "manager2@ethara.dev",
    username: "manager2",
    name: "Nisha Manager",
    role: "ADMIN",
  },
  {
    email: "member1@ethara.dev",
    username: "member1",
    name: "Mira Member",
    role: "MEMBER",
  },
  {
    email: "member2@ethara.dev",
    username: "member2",
    name: "Kabir Member",
    role: "MEMBER",
  },
  {
    email: "member3@ethara.dev",
    username: "member3",
    name: "Ira Member",
    role: "MEMBER",
  },
  {
    email: "member4@ethara.dev",
    username: "member4",
    name: "Dev Member",
    role: "MEMBER",
  },
  {
    email: "member5@ethara.dev",
    username: "member5",
    name: "Riya Member",
    role: "MEMBER",
  },
  {
    email: "member6@ethara.dev",
    username: "member6",
    name: "Omar Member",
    role: "MEMBER",
  },
  {
    email: "member7@ethara.dev",
    username: "member7",
    name: "Tara Member",
    role: "MEMBER",
  },
  {
    email: "member8@ethara.dev",
    username: "member8",
    name: "Neel Member",
    role: "MEMBER",
  },
] satisfies Array<{
  email: string;
  username: string;
  name: string;
  role: "ADMIN" | "MEMBER";
}>;

async function upsertUser(
  user: {
    email: string;
    username: string;
    name: string;
    role: "ADMIN" | "MEMBER";
  },
  passwordHash: string,
) {
  return prisma.user.upsert({
    where: { email: user.email },
    update: {
      name: user.name,
      username: user.username,
      passwordHash,
      role: user.role,
      emailVerified: new Date(),
    },
    create: {
      name: user.name,
      username: user.username,
      email: user.email,
      passwordHash,
      role: user.role,
      emailVerified: new Date(),
    },
  });
}

async function main() {
  const passwordHash = await hash("Password@123", 12);

  const admin = await upsertUser(
    {
      email: "admin@ethara.dev",
      username: "aarav",
      name: "Aarav Admin",
      role: "ADMIN",
    },
    passwordHash,
  );

  const member = await upsertUser(
    {
      email: "member@ethara.dev",
      username: "mira",
      name: "Mira Member",
      role: "MEMBER",
    },
    passwordHash,
  );

  const demoAccounts = await Promise.all(
    demoUsers.map((user) => upsertUser(user, passwordHash)),
  );

  const [manager1, manager2, member1, member2, member3, member4] = demoAccounts;

  const project = await prisma.project.upsert({
    where: { id: "seed-project-ethara" },
    update: {
      name: projectName,
      description: projectDescription,
      ownerId: manager1.id,
      deletedAt: null,
    },
    create: {
      id: "seed-project-ethara",
      name: projectName,
      description: projectDescription,
      ownerId: manager1.id,
      members: {
        create: [
          { userId: manager1.id, role: "ADMIN" },
          { userId: manager2.id, role: "ADMIN" },
          { userId: member1.id, role: "MEMBER" },
          { userId: member2.id, role: "MEMBER" },
        ],
      },
    },
  });

  await Promise.all(
    [admin, member, ...demoAccounts].map((account) =>
      prisma.projectMember.upsert({
        where: {
          projectId_userId: {
            projectId: project.id,
            userId: account.id,
          },
        },
        update: { role: account.role },
        create: {
          projectId: project.id,
          userId: account.id,
          role: account.role,
        },
      }),
    ),
  );

  const tasks = [
    {
      id: "seed-task-dashboard",
      title: "Review operations dashboard",
      description: "Validate status, priority, and overdue summaries for weekly planning.",
      projectId: project.id,
      assignedToId: manager1.id,
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
      assignedToId: member1.id,
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
      assignedToId: member2.id,
      priority: "MEDIUM",
      status: "REVIEW",
      order: 0,
      dueDate: new Date(Date.now() - 1000 * 60 * 60 * 24),
    },
    {
      id: "seed-task-research",
      title: "Map onboarding risks",
      description: "Capture role, invitation, and delivery risks before client onboarding.",
      projectId: project.id,
      assignedToId: member3.id,
      priority: "HIGH",
      status: "TODO",
      order: 1,
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 4),
    },
    {
      id: "seed-task-qa",
      title: "Run release acceptance checks",
      description: "Validate auth, RBAC, dashboard analytics, and collaboration flows.",
      projectId: project.id,
      assignedToId: member4.id,
      priority: "MEDIUM",
      status: "REVIEW",
      order: 1,
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
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
