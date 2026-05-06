import type { Priority, Role, TaskStatus } from "@prisma/client";

export type DashboardUser = {
  id: string;
  name: string | null;
  email: string | null;
  username: string | null;
  image: string | null;
  role: Role;
};

export type DashboardMember = {
  id: string;
  role: Role;
  user: DashboardUser;
};

export type DashboardProject = {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  updatedAt: string;
  members: DashboardMember[];
  taskCount: number;
};

export type DashboardTask = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  dueDate: string | null;
  order: number;
  projectId: string;
  assignedToId: string | null;
  assignedTo: DashboardUser | null;
  commentsCount: number;
};

export type DashboardComment = {
  id: string;
  body: string;
  taskId: string;
  createdAt: string;
  user: DashboardUser;
  referencedTasks: Array<{
    id: string;
    title: string;
    status: TaskStatus;
  }>;
};

export type DashboardNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
};

export type DashboardProjectMessage = {
  id: string;
  body: string;
  projectId: string;
  createdAt: string;
  user: DashboardUser;
  referencedTasks: Array<{
    id: string;
    title: string;
    status: TaskStatus;
  }>;
};

export type DashboardAnalytics = {
  total: number;
  overdue: number;
  status: Array<{ name: string; value: number }>;
  priority: Array<{ name: string; value: number }>;
};
