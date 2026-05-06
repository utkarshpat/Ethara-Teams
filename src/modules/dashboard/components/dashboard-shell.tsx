"use client";

import type { Priority, TaskStatus } from "@prisma/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  type LucideIcon,
  LogOut,
  ListTodo,
  Plus,
  Timer,
  Users,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
} from "recharts";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useProjectRealtime } from "@/hooks/use-realtime";
import { KanbanBoard } from "@/modules/dashboard/components/kanban-board";
import { ProjectChat } from "@/modules/dashboard/components/project-chat";
import { TaskSheet } from "@/modules/dashboard/components/task-sheet";
import type {
  DashboardAnalytics,
  DashboardNotification,
  DashboardProject,
  DashboardTask,
  DashboardUser,
} from "@/modules/dashboard/types";
import { useUiStore } from "@/stores/ui-store";

type DashboardShellProps = {
  currentUser: DashboardUser;
  initialProjects: DashboardProject[];
  initialTasks: DashboardTask[];
  initialAnalytics: DashboardAnalytics;
  initialNotifications: DashboardNotification[];
  initialProjectId: string | null;
};

const chartConfig = {
  value: {
    label: "Tasks",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

const priorityColors = {
  LOW: "var(--chart-1)",
  MEDIUM: "var(--chart-2)",
  HIGH: "var(--chart-3)",
  URGENT: "var(--chart-4)",
};

const selectClassName =
  "h-9 w-full rounded-lg border border-input bg-input px-3 text-sm text-foreground outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/35";

async function fetchJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, init);

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error ?? "Request failed");
  }

  return (await response.json()) as T;
}

function initials(user: DashboardUser) {
  const source = user.name || user.email || "ET";
  return source
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function toDateTimeInput(date: string) {
  return new Date(date).toISOString().slice(0, 16);
}

export function DashboardShell({
  currentUser,
  initialProjects,
  initialTasks,
  initialAnalytics,
  initialNotifications,
  initialProjectId,
}: DashboardShellProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const selectedTaskId = useUiStore((state) => state.selectedTaskId);
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId);
  const [optimisticTasks, setOptimisticTasks] = useState<DashboardTask[] | null>(
    null,
  );
  const [isProjectDialogOpen, setProjectDialogOpen] = useState(false);
  const [isTaskDialogOpen, setTaskDialogOpen] = useState(false);
  const [isMemberDialogOpen, setMemberDialogOpen] = useState(false);
  useProjectRealtime(selectedProjectId, {
    "task:created": () => refreshProjectData(),
    "task:updated": () => refreshProjectData(),
    "task:status_changed": () => refreshProjectData(),
    "task:deleted": () => refreshProjectData(),
    "comment:created": () => refreshProjectData(),
    "project:message_created": () => {
      queryClient.invalidateQueries({
        queryKey: ["project-messages", selectedProjectId],
      });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: () => fetchJson<DashboardProject[]>("/api/projects"),
    initialData: initialProjects,
  });

  const tasksQuery = useQuery({
    queryKey: ["tasks", selectedProjectId],
    queryFn: () =>
      selectedProjectId
        ? fetchJson<DashboardTask[]>(`/api/projects/${selectedProjectId}/tasks`)
        : Promise.resolve([]),
    initialData: initialTasks,
    enabled: Boolean(selectedProjectId),
  });

  const analyticsQuery = useQuery({
    queryKey: ["analytics", selectedProjectId],
    queryFn: () =>
      selectedProjectId
        ? fetchJson<DashboardAnalytics>(
            `/api/projects/${selectedProjectId}/analytics`,
          )
        : Promise.resolve({ total: 0, overdue: 0, status: [], priority: [] }),
    initialData: initialAnalytics,
    enabled: Boolean(selectedProjectId),
  });

  const notificationsQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: () => fetchJson<DashboardNotification[]>("/api/notifications"),
    initialData: initialNotifications,
  });

  const selectedProject = projectsQuery.data.find(
    (project) => project.id === selectedProjectId,
  );
  const selectedMembership = selectedProject?.members.find(
    (member) => member.user.id === currentUser.id,
  );
  const selectedProjectRole =
    currentUser.role === "ADMIN" || selectedMembership?.role === "ADMIN"
      ? "ADMIN"
      : "MEMBER";
  const canManageProject = Boolean(selectedProject) && selectedProjectRole === "ADMIN";
  const roleLabel = selectedProject
    ? `Project ${selectedProjectRole}`
    : currentUser.role;

  const boardTasks = optimisticTasks ?? tasksQuery.data;
  const selectedTask = boardTasks.find((task) => task.id === selectedTaskId) ?? null;
  const unreadCount = notificationsQuery.data.filter((item) => !item.read).length;

  function refreshProjectData() {
    if (!selectedProjectId) {
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["tasks", selectedProjectId] });
    queryClient.invalidateQueries({
      queryKey: ["analytics", selectedProjectId],
    });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }

  const projectMutation = useMutation({
    mutationFn: (payload: { name: string; description?: string }) =>
      fetchJson<{ id: string }>("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: async (project) => {
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      setSelectedProjectId(project.id);
      setProjectDialogOpen(false);
      router.push(`/dashboard?projectId=${project.id}`);
      toast.success("Project created");
    },
    onError: (error) => toast.error(error.message),
  });

  const taskMutation = useMutation({
    mutationFn: (payload: {
      title: string;
      description?: string;
      priority: Priority;
      dueDate?: string | null;
      assignedToId?: string | null;
    }) =>
      fetchJson<DashboardTask>(`/api/projects/${selectedProjectId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tasks", selectedProjectId] });
      await queryClient.invalidateQueries({
        queryKey: ["analytics", selectedProjectId],
      });
      setTaskDialogOpen(false);
      toast.success("Task created");
    },
    onError: (error) => toast.error(error.message),
  });

  const memberMutation = useMutation({
    mutationFn: (payload: { email: string; role: "ADMIN" | "MEMBER" }) =>
      fetchJson(`/api/projects/${selectedProjectId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      setMemberDialogOpen(false);
      toast.success("Member updated");
    },
    onError: (error) => toast.error(error.message),
  });

  const moveMutation = useMutation({
    mutationFn: (payload: {
      taskId: string;
      status: TaskStatus;
      order: number;
    }) =>
      fetchJson<DashboardTask>(`/api/tasks/${payload.taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: payload.status,
          order: payload.order,
        }),
      }),
    onError: (error) => {
      toast.error(error.message);
      setOptimisticTasks(null);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tasks", selectedProjectId] });
      setOptimisticTasks(null);
    },
  });

  const analytics = analyticsQuery.data;
  const statusData = useMemo(
    () =>
      ["TODO", "IN_PROGRESS", "REVIEW", "DONE"].map((status) => ({
        name: status.replace("_", " "),
        value:
          analytics.status.find((item) => item.name === status)?.value ?? 0,
      })),
    [analytics.status],
  );

  function handleProjectSelect(projectId: string) {
    setOptimisticTasks(null);
    setSelectedProjectId(projectId);
    router.push(`/dashboard?projectId=${projectId}`);
  }

  function canMoveTask(task: DashboardTask) {
    return canManageProject || task.assignedToId === currentUser.id;
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-5 px-4 py-4 lg:px-6">
      <header className="glass-panel flex flex-col gap-4 rounded-lg px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="grid size-11 place-items-center rounded-md bg-primary text-sm font-semibold text-primary-foreground shadow-[0_0_20px_rgba(255,0,255,0.35)]">
            ET
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Ethara Teams</p>
            <h1 className="text-2xl font-semibold tracking-normal">
              {selectedProject?.name ?? "Project dashboard"}
            </h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ThemeToggle />
          <div className="flex items-center gap-2 rounded-md border border-white/10 bg-[#11182766] px-3 py-2 backdrop-blur-xl">
            <span className="grid size-7 place-items-center rounded-md bg-primary/15 text-primary">
              <Bell />
            </span>
            <span className="mono-meta text-sm font-semibold">{unreadCount}</span>
            <span className="text-xs text-muted-foreground">unread</span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className="group flex items-center gap-2 rounded-md border border-white/10 bg-[#11182766] px-3 py-2 text-left backdrop-blur-xl transition-all hover:border-white/20 hover:bg-white/10 hover:shadow-lg"
                />
              }
            >
                <Avatar className="size-8 transition-transform group-hover:scale-105">
                  <AvatarImage src={currentUser.image ?? undefined} />
                  <AvatarFallback>{initials(currentUser)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {currentUser.name ?? currentUser.email}
                  </p>
                  <p className="text-xs text-muted-foreground">{roleLabel}</p>
                </div>
              
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })} className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive">
                <LogOut className="mr-2 size-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <div className="grid flex-1 gap-5 xl:grid-cols-[280px_1fr]">
        <aside className="glass-panel flex flex-col gap-5 rounded-lg p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold tracking-normal">Projects</h2>
              <p className="text-xs text-muted-foreground">
                {projectsQuery.data.length} active
              </p>
            </div>
            {currentUser.role === "ADMIN" ? (
              <ProjectDialog
                open={isProjectDialogOpen}
                onOpenChange={setProjectDialogOpen}
                onSubmit={(payload) => projectMutation.mutate(payload)}
                isPending={projectMutation.isPending}
              />
            ) : null}
          </div>
          <div className="flex flex-col gap-2">
            {projectsQuery.data.map((project) => (
              <button
                key={project.id}
                type="button"
                onClick={() => handleProjectSelect(project.id)}
                className={`rounded-md border px-3 py-3 text-left transition ${
                  project.id === selectedProjectId
                    ? "border-primary/70 bg-primary/10 text-foreground shadow-[0_0_20px_rgba(255,0,255,0.18)]"
                    : "border-white/10 bg-[#11182766] hover:border-primary/35 hover:bg-primary/10"
                }`}
              >
                <span className="grid gap-2">
                  <span className="block truncate text-sm font-medium">
                    {project.name}
                  </span>
                  <span className="flex items-center justify-between gap-3">
                    <span className="text-xs text-muted-foreground">
                      {project.taskCount} tasks
                    </span>
                    <Badge variant="outline" className="mono-meta shrink-0">
                      {project.members.length} members
                    </Badge>
                  </span>
                </span>
              </button>
            ))}
            {!projectsQuery.data.length ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                No projects yet. Admin users can create the first workspace.
              </div>
            ) : null}
          </div>
          <Separator />
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold tracking-normal">Team</h2>
                <p className="text-xs text-muted-foreground">
                  {canManageProject
                    ? "Add members to assign project work"
                    : "Members assigned to this project"}
                </p>
              </div>
              {selectedProject && canManageProject ? (
                <MemberDialog
                  open={isMemberDialogOpen}
                  onOpenChange={setMemberDialogOpen}
                  onSubmit={(payload) => memberMutation.mutate(payload)}
                  isPending={memberMutation.isPending}
                />
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              {selectedProject?.members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-white/10 bg-[#11182766] px-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <Avatar className="size-7">
                      <AvatarImage src={member.user.image ?? undefined} />
                      <AvatarFallback>{initials(member.user)}</AvatarFallback>
                    </Avatar>
                    <span className="truncate text-sm">
                      {member.user.name ?? member.user.email}
                    </span>
                  </div>
                  <Badge variant="outline">{member.role}</Badge>
                </div>
              ))}
            </div>
          </div>
        </aside>
        <section className="flex min-w-0 flex-col gap-5">
          <div className="grid gap-4 lg:grid-cols-4">
            <MetricCard title="Total tasks" value={analytics.total} icon={ListTodo} />
            <MetricCard title="Overdue" value={analytics.overdue} icon={AlertCircle} />
            <MetricCard
              title="Done"
              value={
                analytics.status.find((item) => item.name === "DONE")?.value ?? 0
              }
              icon={CheckCircle2}
            />
            <MetricCard
              title="In progress"
              value={
                analytics.status.find((item) => item.name === "IN_PROGRESS")
                  ?.value ?? 0
              }
              icon={Timer}
            />
          </div>

          <div className="grid gap-4 2xl:grid-cols-[1fr_360px]">
            <Card className="glass-panel rounded-lg">
              <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle>Execution board</CardTitle>
                  <CardDescription>
                    {canManageProject
                      ? "Create tasks, assign members, and drag work across stages."
                      : "Drag your assigned tasks across stages for progress updates."}
                  </CardDescription>
                </div>
                {selectedProject && canManageProject ? (
                  <TaskDialog
                    open={isTaskDialogOpen}
                    onOpenChange={setTaskDialogOpen}
                    members={selectedProject.members}
                    onSubmit={(payload) => taskMutation.mutate(payload)}
                    isPending={taskMutation.isPending}
                  />
                ) : null}
              </CardHeader>
              <CardContent>
                <KanbanBoard
                  tasks={boardTasks}
                  onReorder={setOptimisticTasks}
                  canMoveTask={canMoveTask}
                  onDeniedMove={() =>
                    toast.info("Members can only move tasks assigned to them")
                  }
                  onMove={(taskId, status, order) =>
                    moveMutation.mutate({ taskId, status, order })
                  }
                />
              </CardContent>
            </Card>
            <div className="grid gap-4">
              <ProjectChat
                projectId={selectedProjectId}
                members={selectedProject?.members ?? []}
                tasks={boardTasks}
              />
              <Card className="glass-panel rounded-lg">
                <CardHeader>
                  <CardTitle>Status</CardTitle>
                  <CardDescription>Current project flow</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[240px] w-full">
                    <BarChart data={statusData}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="value" radius={6} fill="var(--chart-1)" />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
              <Card className="glass-panel rounded-lg">
                <CardHeader>
                  <CardTitle>Priority</CardTitle>
                  <CardDescription>Workload distribution</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[240px] w-full">
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Pie
                        data={analytics.priority}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={52}
                        outerRadius={86}
                        paddingAngle={4}
                      >
                        {analytics.priority.map((item) => (
                          <Cell
                            key={item.name}
                            fill={
                              priorityColors[item.name as keyof typeof priorityColors] ??
                              "var(--chart-5)"
                            }
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                </CardContent>
              </Card>
              <Card className="glass-panel rounded-lg">
                <CardHeader>
                  <CardTitle>Notifications</CardTitle>
                  <CardDescription>Mentions and task events</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {notificationsQuery.data.slice(0, 5).map((notification) => (
                    <div
                      key={notification.id}
                      className="rounded-md border border-white/10 bg-[#11182766] p-3"
                    >
                      <p className="text-sm font-medium">{notification.title}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {notification.body}
                      </p>
                    </div>
                  ))}
                  {!notificationsQuery.data.length ? (
                    <p className="text-sm text-muted-foreground">
                      No notifications yet.
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </div>
      <TaskSheet
        task={selectedTask}
        members={selectedProject?.members ?? []}
        tasks={boardTasks}
        canManageProject={canManageProject}
      />
    </main>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: number;
  icon: LucideIcon;
}) {
  return (
    <Card className="glass-panel rounded-lg overflow-hidden relative group">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <CardContent className="flex items-center justify-between gap-4 p-5 relative z-10">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-semibold tracking-normal">{value}</p>
        </div>
        <div className="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary shadow-inner transition-transform group-hover:scale-110 group-hover:bg-primary/20 duration-300">
          <Icon className="size-6" />
        </div>
      </CardContent>
    </Card>
  );
}

function ProjectDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: { name: string; description?: string }) => void;
  isPending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger
        render={<Button size="sm" variant="outline" />}
      >
        <Plus data-icon="inline-start" />
        New project
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create project</DialogTitle>
          <DialogDescription>
            Start a secure workspace boundary for tasks and team members.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            onSubmit({
              name: String(formData.get("name") ?? ""),
              description: String(formData.get("description") ?? ""),
            });
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="project-name">Name</FieldLabel>
              <Input id="project-name" name="name" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="project-description">Description</FieldLabel>
              <Textarea id="project-description" name="description" rows={3} />
            </Field>
          </FieldGroup>
          <Button type="submit" disabled={isPending}>
            Create project
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TaskDialog({
  open,
  onOpenChange,
  members,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: DashboardProject["members"];
  onSubmit: (payload: {
    title: string;
    description?: string;
    priority: Priority;
    dueDate?: string | null;
    assignedToId?: string | null;
  }) => void;
  isPending: boolean;
}) {
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [assignedToId, setAssignedToId] = useState<string>("unassigned");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={<Button />}>
        <Plus data-icon="inline-start" />
        New task
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create task</DialogTitle>
          <DialogDescription>
            Add an assignable work item to the active project.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const dueDate = String(formData.get("dueDate") ?? "");
            onSubmit({
              title: String(formData.get("title") ?? ""),
              description: String(formData.get("description") ?? ""),
              priority,
              assignedToId:
                assignedToId === "unassigned" ? null : assignedToId,
              dueDate: dueDate ? new Date(dueDate).toISOString() : null,
            });
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="task-title">Title</FieldLabel>
              <Input id="task-title" name="title" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="task-description">Description</FieldLabel>
              <Textarea id="task-description" name="description" rows={3} />
            </Field>
            <Field>
              <FieldLabel>Priority</FieldLabel>
              <select
                className={selectClassName}
                value={priority}
                onChange={(event) => setPriority(event.target.value as Priority)}
              >
                {["LOW", "MEDIUM", "HIGH", "URGENT"].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </Field>
            <Field>
              <FieldLabel>Assignee</FieldLabel>
              <select
                className={selectClassName}
                value={assignedToId}
                onChange={(event) => setAssignedToId(event.target.value)}
              >
                <option value="unassigned">Unassigned</option>
                {members.map((member) => (
                  <option key={member.user.id} value={member.user.id}>
                    {member.user.name ?? member.user.email}
                  </option>
                ))}
              </select>
            </Field>
            <Field>
              <FieldLabel htmlFor="task-due-date">Due date</FieldLabel>
              <Input
                id="task-due-date"
                name="dueDate"
                type="datetime-local"
                min={toDateTimeInput(new Date().toISOString())}
              />
            </Field>
          </FieldGroup>
          <Button type="submit" disabled={isPending}>
            Create task
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MemberDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: { email: string; role: "ADMIN" | "MEMBER" }) => void;
  isPending: boolean;
}) {
  const [role, setRole] = useState<"ADMIN" | "MEMBER">("MEMBER");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger
        render={<Button size="sm" variant="outline" />}
      >
        <Users data-icon="inline-start" />
        Add member
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add team member</DialogTitle>
          <DialogDescription>
            Add an existing user to this project boundary.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            onSubmit({
              email: String(formData.get("email") ?? ""),
              role,
            });
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="member-email">Email</FieldLabel>
              <Input id="member-email" name="email" type="email" required />
            </Field>
            <Field>
              <FieldLabel>Role</FieldLabel>
              <select
                className={selectClassName}
                value={role}
                onChange={(event) =>
                  setRole(event.target.value as "ADMIN" | "MEMBER")
                }
              >
                <option value="MEMBER">MEMBER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </Field>
          </FieldGroup>
          <Button type="submit" disabled={isPending}>
            Save member
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
