import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { getProjectAnalytics } from "@/modules/analytics";
import { DashboardShell } from "@/modules/dashboard/components/dashboard-shell";
import type {
  DashboardAnalytics,
  DashboardNotification,
  DashboardProject,
  DashboardTask,
} from "@/modules/dashboard/types";
import { listNotifications } from "@/modules/notifications";
import { listProjects } from "@/modules/projects";
import { listProjectTasks } from "@/modules/tasks";

export const metadata: Metadata = {
  title: "Dashboard",
};

type DashboardPageProps = {
  searchParams: Promise<{
    projectId?: string;
  }>;
};

function serializeProject(project: Awaited<ReturnType<typeof listProjects>>[number]): DashboardProject {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    ownerId: project.ownerId,
    updatedAt: project.updatedAt.toISOString(),
    taskCount: project._count.tasks,
    members: project.members.map((member) => ({
      id: member.id,
      role: member.role,
      user: member.user,
    })),
  };
}

function serializeTask(task: Awaited<ReturnType<typeof listProjectTasks>>[number]): DashboardTask {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate?.toISOString() ?? null,
    order: task.order,
    projectId: task.projectId,
    assignedToId: task.assignedToId,
    assignedTo: task.assignedTo,
    commentsCount: task._count.comments,
  };
}

function serializeNotification(
  notification: Awaited<ReturnType<typeof listNotifications>>[number],
): DashboardNotification {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    link: notification.link,
    read: notification.read,
    createdAt: notification.createdAt.toISOString(),
  };
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const user = await requireUser();
  const params = await searchParams;
  const projects = await listProjects(user.id);
  const selectedProjectId = params.projectId ?? projects[0]?.id ?? null;

  const [tasks, analytics, notifications] = selectedProjectId
    ? await Promise.all([
        listProjectTasks(user.id, selectedProjectId),
        getProjectAnalytics(user.id, selectedProjectId),
        listNotifications(user.id),
      ])
    : [[], { total: 0, overdue: 0, status: [], priority: [] } satisfies DashboardAnalytics, await listNotifications(user.id)];

  return (
    <DashboardShell
      currentUser={{
        id: user.id,
        name: user.name ?? null,
        email: user.email ?? null,
        username: user.username ?? null,
        image: user.image ?? null,
        role: user.role,
      }}
      initialProjects={projects.map(serializeProject)}
      initialTasks={tasks.map(serializeTask)}
      initialAnalytics={analytics}
      initialNotifications={notifications.map(serializeNotification)}
      initialProjectId={selectedProjectId}
    />
  );
}
