"use client";

import type { Priority, TaskStatus } from "@prisma/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  BarChart3,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  LayoutDashboard,
  ListTodo,
  LogOut,
  MessageSquare,
  Plus,
  Search,
  Settings,
  Timer,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactElement } from "react";
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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useProjectRealtime } from "@/hooks/use-realtime";
import { cn } from "@/lib/utils";
import { CalendarPanel } from "@/modules/dashboard/components/calendar-panel";
import { KanbanBoard } from "@/modules/dashboard/components/kanban-board";
import { ProjectChat } from "@/modules/dashboard/components/project-chat";
import { TaskSheet } from "@/modules/dashboard/components/task-sheet";
import type {
  DashboardAnalytics,
  DashboardNotification,
  DashboardProject,
  DashboardTask,
  DashboardUser,
  DashboardView,
} from "@/modules/dashboard/types";
import { useUiStore } from "@/stores/ui-store";

type DashboardShellProps = {
  currentUser: DashboardUser;
  initialProjects: DashboardProject[];
  initialTasks: DashboardTask[];
  initialAnalytics: DashboardAnalytics;
  initialNotifications: DashboardNotification[];
  initialProjectId: string | null;
  initialView: DashboardView;
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

const statusColors: Record<string, string> = {
  TODO: "#ff00ff",
  "IN PROGRESS": "#06b6d4",
  REVIEW: "#a855f7",
  DONE: "#10b981",
};

const selectClassName =
  "h-9 w-full rounded-lg border border-input bg-input px-3 text-sm text-foreground outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/35";

const railItems: Array<{
  label: string;
  icon: LucideIcon;
  view: DashboardView;
  href: string;
}> = [
  { label: "Home", icon: LayoutDashboard, view: "overview", href: "/dashboard" },
  { label: "Tasks", icon: ListTodo, view: "board", href: "/dashboard/tasks" },
  { label: "Calendar", icon: CalendarDays, view: "calendar", href: "/dashboard/calendar" },
  { label: "Chat", icon: MessageSquare, view: "chat", href: "/dashboard/chat" },
  { label: "Reports", icon: BarChart3, view: "reports", href: "/dashboard/reports" },
  { label: "Team", icon: Users, view: "team", href: "/dashboard/team" },
];

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

function todayLabel() {
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date());
}

function viewPath(view: DashboardView) {
  if (view === "overview") {
    return "/dashboard";
  }

  if (view === "board") {
    return "/dashboard/tasks";
  }

  return `/dashboard/${view}`;
}

function viewLabel(view: DashboardView) {
  const labels: Record<DashboardView, string> = {
    overview: "Project overview",
    board: "Active sprint",
    calendar: "Calendar",
    chat: "Project chat",
    reports: "Reports",
    team: "Team",
  };

  return labels[view];
}

export function DashboardShell({
  currentUser,
  initialProjects,
  initialTasks,
  initialAnalytics,
  initialNotifications,
  initialProjectId,
  initialView,
}: DashboardShellProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const selectedTaskId = useUiStore((state) => state.selectedTaskId);
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId);
  const [activeView, setActiveView] = useState<DashboardView>(initialView);
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
  const canManageProject =
    Boolean(selectedProject) && selectedProjectRole === "ADMIN";
  const canCreateTask = Boolean(selectedProject) && canManageProject;
  const roleLabel = selectedProject
    ? `Project ${selectedProjectRole}`
    : currentUser.role;

  const boardTasks = optimisticTasks ?? tasksQuery.data;
  const selectedTask =
    boardTasks.find((task) => task.id === selectedTaskId) ?? null;
  const unreadCount = notificationsQuery.data.filter((item) => !item.read).length;
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
      fetchJson<{ kind: "member" | "invitation" }>(
        `/api/projects/${selectedProjectId}/members`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      ),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      setMemberDialogOpen(false);
      toast.success(
        result.kind === "invitation" ? "Invitation sent" : "Member updated",
      );
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

  function handleProjectSelect(projectId: string) {
    setOptimisticTasks(null);
    setSelectedProjectId(projectId);
    router.push(`${viewPath(activeView)}?projectId=${projectId}`);
  }

  function canMoveTask(task: DashboardTask) {
    return canManageProject || task.assignedToId === currentUser.id;
  }

  return (
    <main className="min-h-screen p-3 text-foreground lg:p-4">
      <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] w-full max-w-[1760px] overflow-hidden rounded-2xl border border-white/10 bg-[#070d22]/85 shadow-2xl shadow-black/30 backdrop-blur-2xl">
        <WorkspaceRail
          activeView={activeView}
          selectedProjectId={selectedProjectId}
          unreadCount={unreadCount}
          onSelect={(view) => {
            setActiveView(view);
            router.push(`${viewPath(view)}${selectedProjectId ? `?projectId=${selectedProjectId}` : ""}`);
          }}
        />
        <WorkspaceSidebar
          currentUser={currentUser}
          projects={projectsQuery.data}
          selectedProjectId={selectedProjectId}
          selectedProject={selectedProject}
          canManageProject={canManageProject}
          isProjectDialogOpen={isProjectDialogOpen}
          setProjectDialogOpen={setProjectDialogOpen}
          projectMutation={projectMutation}
          isMemberDialogOpen={isMemberDialogOpen}
          setMemberDialogOpen={setMemberDialogOpen}
          memberMutation={memberMutation}
          isTaskDialogOpen={isTaskDialogOpen}
          setTaskDialogOpen={setTaskDialogOpen}
          taskMutation={taskMutation}
          onProjectSelect={handleProjectSelect}
        />

        <section className="flex min-w-0 flex-1 flex-col bg-background/70">
          <TopBar
            currentUser={currentUser}
            roleLabel={roleLabel}
            unreadCount={unreadCount}
          />

          <div className="grid min-h-0 flex-1 xl:grid-cols-[minmax(0,1fr)_360px]">
            <ScrollArea className="min-h-0">
              <div className="flex min-w-0 flex-col gap-5 p-4 lg:p-5">
                <ProjectCommandHeader
                  selectedProject={selectedProject}
                  selectedProjectRole={selectedProjectRole}
                  canManageProject={canManageProject}
                  isMemberDialogOpen={isMemberDialogOpen}
                  setMemberDialogOpen={setMemberDialogOpen}
                  memberMutation={memberMutation}
                />

                <MetricStrip analytics={analytics} />

                <Card className="overflow-hidden rounded-2xl border border-border bg-card/50 shadow-sm backdrop-blur-xl">
                  <CardHeader className="border-b border-border/70 px-4 py-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <CardTitle className="truncate">
                          {viewLabel(activeView)}
                        </CardTitle>
                        <CardDescription>
                          {canManageProject
                            ? "Plan, assign, sync, and monitor delivery from one command surface."
                            : "Track assigned work, calendar commitments, and project collaboration."}
                        </CardDescription>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {selectedProject && canCreateTask && activeView === "board" ? (
                          <TaskDialog
                            open={isTaskDialogOpen}
                            onOpenChange={setTaskDialogOpen}
                            members={selectedProject.members}
                            onSubmit={(payload) => taskMutation.mutate(payload)}
                            isPending={taskMutation.isPending}
                          />
                        ) : null}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    {activeView === "overview" ? (
                      <OverviewPanel
                        selectedProject={selectedProject}
                        analytics={analytics}
                        statusData={statusData}
                        notifications={notificationsQuery.data}
                      />
                    ) : null}
                    {activeView === "board" ? (
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
                    ) : null}
                    {activeView === "calendar" ? <CalendarPanel /> : null}
                    {activeView === "chat" ? (
                      <ProjectChat
                        projectId={selectedProjectId}
                        members={selectedProject?.members ?? []}
                        tasks={boardTasks}
                      />
                    ) : null}
                    {activeView === "reports" ? (
                      <ReportsPanel
                        analytics={analytics}
                        statusData={statusData}
                        notifications={notificationsQuery.data}
                      />
                    ) : null}
                    {activeView === "team" ? (
                      <TeamPanel
                        selectedProject={selectedProject}
                        canManageProject={canManageProject}
                        isMemberDialogOpen={isMemberDialogOpen}
                        setMemberDialogOpen={setMemberDialogOpen}
                        memberMutation={memberMutation}
                      />
                    ) : null}
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>

            <aside className="hidden min-h-0 border-l border-border/70 bg-card/30 xl:block">
              <ScrollArea className="h-full">
                <div className="flex flex-col gap-4 p-4">
                  <ProjectChat
                    projectId={selectedProjectId}
                    members={selectedProject?.members ?? []}
                    tasks={boardTasks}
                  />
                  <StatusPanel statusData={statusData} />
                  <NotificationPanel notifications={notificationsQuery.data} />
                </div>
              </ScrollArea>
            </aside>
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

function WorkspaceRail({
  activeView,
  selectedProjectId,
  unreadCount,
  onSelect,
}: {
  activeView: DashboardView;
  selectedProjectId: string | null;
  unreadCount: number;
  onSelect: (view: DashboardView) => void;
}) {
  return (
    <aside className="hidden w-[68px] shrink-0 flex-col items-center gap-4 border-r border-white/10 bg-[#17082e]/90 px-3 py-4 text-white lg:flex">
      <div className="grid size-11 place-items-center rounded-xl bg-gradient-to-br from-primary to-[#7e22ce] text-sm font-bold shadow-[0_0_28px_rgba(255,0,255,0.35)]">
        ET
      </div>
      <nav className="flex flex-1 flex-col items-center gap-2 pt-2">
        {railItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.view === activeView;

          return (
            <button
              key={item.label}
              type="button"
              onClick={() => onSelect(item.view)}
              data-href={`${item.href}${selectedProjectId ? `?projectId=${selectedProjectId}` : ""}`}
              className={cn(
                "relative grid size-11 place-items-center rounded-xl text-white/70 transition hover:bg-white/10 hover:text-white",
                isActive && "bg-white/12 text-white shadow-inner",
              )}
              aria-label={item.label}
              aria-pressed={isActive}
            >
              <Icon />
              {item.label === "Chat" && unreadCount ? (
                <span className="absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-primary text-[10px] font-semibold text-white">
                  {Math.min(unreadCount, 9)}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>
      <button
        type="button"
        onClick={() => onSelect("reports")}
        className="grid size-11 place-items-center rounded-xl bg-white/10 text-white/70 transition hover:text-white"
        aria-label="Settings"
      >
        <Settings />
      </button>
    </aside>
  );
}

function WorkspaceSidebar({
  currentUser,
  projects,
  selectedProjectId,
  selectedProject,
  canManageProject,
  isProjectDialogOpen,
  setProjectDialogOpen,
  projectMutation,
  isMemberDialogOpen,
  setMemberDialogOpen,
  memberMutation,
  isTaskDialogOpen,
  setTaskDialogOpen,
  taskMutation,
  onProjectSelect,
}: {
  currentUser: DashboardUser;
  projects: DashboardProject[];
  selectedProjectId: string | null;
  selectedProject: DashboardProject | undefined;
  canManageProject: boolean;
  isProjectDialogOpen: boolean;
  setProjectDialogOpen: (open: boolean) => void;
  projectMutation: ReturnType<typeof useMutation<{ id: string }, Error, { name: string; description?: string }>>;
  isMemberDialogOpen: boolean;
  setMemberDialogOpen: (open: boolean) => void;
  memberMutation: ReturnType<typeof useMutation<{ kind: "member" | "invitation" }, Error, { email: string; role: "ADMIN" | "MEMBER" }>>;
  isTaskDialogOpen: boolean;
  setTaskDialogOpen: (open: boolean) => void;
  taskMutation: ReturnType<typeof useMutation<DashboardTask, Error, {
    title: string;
    description?: string;
    priority: Priority;
    dueDate?: string | null;
    assignedToId?: string | null;
  }>>;
  onProjectSelect: (projectId: string) => void;
}) {
  return (
    <aside className="hidden w-[272px] shrink-0 flex-col border-r border-white/10 bg-gradient-to-b from-[#2b0d52]/92 via-[#1b0b35]/92 to-[#090513]/94 text-white shadow-2xl shadow-black/25 xl:flex">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              className="flex items-center justify-between gap-3 px-4 py-4 text-left transition hover:bg-white/[0.04]"
            />
          }
        >
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.22em] text-white/45">
              Workspace
            </p>
            <h2 className="mt-1 truncate text-2xl font-semibold tracking-normal">
              Ethara Teams
            </h2>
          </div>
          <ChevronDown className="shrink-0 text-white/60" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[260px]">
          {projects.map((project) => (
            <DropdownMenuItem
              key={project.id}
              onClick={() => onProjectSelect(project.id)}
              className="cursor-pointer"
            >
              <span className="truncate">{project.name}</span>
              {project.id === selectedProjectId ? (
                <Badge variant="outline" className="ml-auto">
                  Active
                </Badge>
              ) : null}
            </DropdownMenuItem>
          ))}
          {currentUser.role === "ADMIN" ? (
            <DropdownMenuItem
              onClick={(event) => {
                event.preventDefault();
                setProjectDialogOpen(true);
              }}
            >
              <Plus />
              New project
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>
            <LogOut />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ProjectDialog
        open={isProjectDialogOpen}
        onOpenChange={setProjectDialogOpen}
        onSubmit={(payload) => projectMutation.mutate(payload)}
        isPending={projectMutation.isPending}
        trigger={null}
      />

      <ScrollArea className="flex-1 px-3">
        <div className="flex flex-col gap-5 pb-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Projects</p>
              <p className="text-xs text-white/50">{projects.length} active</p>
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
          </div>

          <div className="flex flex-col gap-1.5">
            {projects.map((project) => {
              const isSelected = project.id === selectedProjectId;

              return (
                <div
                  key={project.id}
                  className={cn(
                    "group grid grid-cols-[minmax(0,1fr)_34px] items-center rounded-xl border px-2.5 py-2 transition",
                    isSelected
                      ? "border-primary/45 bg-primary/90 text-white shadow-[0_0_20px_rgba(255,0,255,0.22)]"
                      : "border-white/5 bg-white/[0.035] text-white/72 hover:border-white/12 hover:bg-white/[0.075] hover:text-white",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onProjectSelect(project.id)}
                    className="min-w-0 text-left"
                  >
                    <span className="block truncate text-sm font-semibold leading-5">
                      {project.name}
                    </span>
                    <span className="mt-0.5 flex items-center gap-2 text-[11px] text-white/58">
                      <span>{project.taskCount} tasks</span>
                      <span className="size-1 rounded-full bg-white/25" />
                      <span>{project.members.length} members</span>
                    </span>
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <button
                          type="button"
                          className="grid size-8 place-items-center rounded-lg text-white/62 transition hover:bg-white/10 hover:text-white"
                          aria-label={`${project.name} team`}
                        />
                      }
                    >
                      <ChevronDown className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[280px]">
                      {project.members.map((member) => (
                        <DropdownMenuItem key={member.id} className="gap-3">
                          <Avatar className="size-7">
                            <AvatarImage src={member.user.image ?? undefined} />
                            <AvatarFallback>{initials(member.user)}</AvatarFallback>
                          </Avatar>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">
                              {member.user.name ?? member.user.email}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {member.user.email}
                            </span>
                          </span>
                          <Badge variant="outline">{member.role}</Badge>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
            {!projects.length ? (
              <div className="rounded-xl border border-dashed border-white/15 p-4 text-sm text-white/55">
                No projects yet.
              </div>
            ) : null}
          </div>

          <Separator className="bg-white/10" />

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Team</p>
                <p className="text-xs text-white/50">
                  {selectedProject?.members.length ?? 0} people
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
                  className="flex items-center justify-between gap-2 rounded-xl bg-white/[0.06] px-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <Avatar className="size-7">
                      <AvatarImage src={member.user.image ?? undefined} />
                      <AvatarFallback>{initials(member.user)}</AvatarFallback>
                    </Avatar>
                    <span className="truncate text-sm text-white/86">
                      {member.user.name ?? member.user.email}
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-white/50">
                    {member.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>

      <div className="border-t border-white/10 p-4">
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-white/64 transition hover:bg-white/10 hover:text-white"
        >
          <LogOut />
          Log out
        </button>
      </div>
    </aside>
  );
}

function TopBar({
  currentUser,
  roleLabel,
  unreadCount,
}: {
  currentUser: DashboardUser;
  roleLabel: string;
  unreadCount: number;
}) {
  return (
    <header className="flex min-h-16 items-center justify-between gap-3 border-b border-border/70 bg-card/40 px-4 backdrop-blur-xl lg:px-5">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex h-9 min-w-0 max-w-xl flex-1 items-center gap-2 rounded-xl border border-border bg-background/70 px-3 text-sm text-muted-foreground shadow-inner">
          <Search />
          <input
            aria-label="Search"
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            placeholder="Search people, projects or tasks"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <div className="hidden items-center gap-2 rounded-xl border border-border bg-background/60 px-3 py-2 text-sm md:flex">
          <Bell />
          <span className="font-medium">{unreadCount}</span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="flex items-center gap-2 rounded-xl border border-border bg-background/60 px-2 py-1.5 text-left transition hover:border-primary/30"
              />
            }
          >
            <Avatar className="size-8">
              <AvatarImage src={currentUser.image ?? undefined} />
              <AvatarFallback>{initials(currentUser)}</AvatarFallback>
            </Avatar>
            <div className="hidden min-w-0 sm:block">
              <p className="max-w-32 truncate text-sm font-medium">
                {currentUser.name ?? currentUser.email}
              </p>
              <p className="text-xs text-muted-foreground">{roleLabel}</p>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[210px]">
            <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>
              <LogOut />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

function ProjectCommandHeader({
  selectedProject,
  selectedProjectRole,
  canManageProject,
  isMemberDialogOpen,
  setMemberDialogOpen,
  memberMutation,
}: {
  selectedProject: DashboardProject | undefined;
  selectedProjectRole: "ADMIN" | "MEMBER";
  canManageProject: boolean;
  isMemberDialogOpen: boolean;
  setMemberDialogOpen: (open: boolean) => void;
  memberMutation: ReturnType<typeof useMutation<{ kind: "member" | "invitation" }, Error, { email: string; role: "ADMIN" | "MEMBER" }>>;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card/55 shadow-sm backdrop-blur-xl">
      <div className="flex flex-col gap-5 p-5 2xl:flex-row 2xl:items-center 2xl:justify-between">
        <div className="min-w-0">
          <button
            type="button"
            className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground"
          >
            <CircleDot />
            Back to projects
          </button>
          <h1 className="max-w-full text-3xl font-semibold tracking-normal">
            {selectedProject?.name ?? "Project dashboard"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {selectedProject?.description ??
              "Manage team work, sync meetings, task execution, and project-level collaboration."}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 2xl:min-w-[520px]">
          <HeaderStat label="Today" value={todayLabel()} />
          <HeaderStat
            label="People on project"
            value={`${selectedProject?.members.length ?? 0} members`}
          />
          <HeaderStat label="Access" value={`Project ${selectedProjectRole}`} />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 px-5 py-3">
        <div className="flex -space-x-2">
          {selectedProject?.members.slice(0, 7).map((member) => (
            <Avatar key={member.id} className="size-8 border-2 border-background">
              <AvatarImage src={member.user.image ?? undefined} />
              <AvatarFallback>{initials(member.user)}</AvatarFallback>
            </Avatar>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selectedProject && canManageProject ? (
            <MemberDialog
              open={isMemberDialogOpen}
              onOpenChange={setMemberDialogOpen}
              onSubmit={(payload) => memberMutation.mutate(payload)}
              isPending={memberMutation.isPending}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}

function HeaderStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/55 px-3 py-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}

function MetricStrip({ analytics }: { analytics: DashboardAnalytics }) {
  const done = analytics.status.find((item) => item.name === "DONE")?.value ?? 0;
  const progress =
    analytics.status.find((item) => item.name === "IN_PROGRESS")?.value ?? 0;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard title="Total tasks" value={analytics.total} icon={ListTodo} />
      <MetricCard title="Overdue" value={analytics.overdue} icon={AlertCircle} />
      <MetricCard title="Done" value={done} icon={CheckCircle2} />
      <MetricCard title="In progress" value={progress} icon={Timer} />
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: number;
  icon: typeof ListTodo;
}) {
  return (
    <Card className="overflow-hidden rounded-2xl border border-border bg-card/55 shadow-sm backdrop-blur-xl">
      <CardContent className="flex items-center justify-between gap-3 p-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {title}
          </p>
          <p className="mt-1 text-2xl font-semibold tracking-normal">{value}</p>
        </div>
        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon />
        </div>
      </CardContent>
    </Card>
  );
}

function OverviewPanel({
  selectedProject,
  analytics,
  statusData,
  notifications,
}: {
  selectedProject: DashboardProject | undefined;
  analytics: DashboardAnalytics;
  statusData: Array<{ name: string; value: number }>;
  notifications: DashboardNotification[];
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="grid gap-4 lg:grid-cols-2">
        <StatusPanel statusData={statusData} />
        <PriorityPanel analytics={analytics} />
      </div>
      <Card className="rounded-2xl border border-border bg-card/55 shadow-sm backdrop-blur-xl">
        <CardHeader>
          <CardTitle>{selectedProject?.name ?? "Workspace"}</CardTitle>
          <CardDescription>
            {selectedProject?.description ??
              "Project delivery, team ownership, and collaboration health."}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <div className="flex items-center justify-between rounded-xl border border-border bg-background/50 p-3">
            <span className="text-muted-foreground">Active tasks</span>
            <span className="font-semibold">{analytics.total}</span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border bg-background/50 p-3">
            <span className="text-muted-foreground">Overdue</span>
            <span className="font-semibold text-primary">{analytics.overdue}</span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border bg-background/50 p-3">
            <span className="text-muted-foreground">Team members</span>
            <span className="font-semibold">{selectedProject?.members.length ?? 0}</span>
          </div>
          <Separator />
          <div className="grid gap-2">
            <p className="text-sm font-semibold">Recent signals</p>
            {notifications.slice(0, 3).map((notification) => (
              <div
                key={notification.id}
                className="rounded-xl border border-border bg-background/45 p-3"
              >
                <p className="line-clamp-1 text-sm font-medium">
                  {notification.title}
                </p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {notification.body}
                </p>
              </div>
            ))}
            {!notifications.length ? (
              <p className="text-sm text-muted-foreground">No recent signals yet.</p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TeamPanel({
  selectedProject,
  canManageProject,
  isMemberDialogOpen,
  setMemberDialogOpen,
  memberMutation,
}: {
  selectedProject: DashboardProject | undefined;
  canManageProject: boolean;
  isMemberDialogOpen: boolean;
  setMemberDialogOpen: (open: boolean) => void;
  memberMutation: ReturnType<typeof useMutation<{ kind: "member" | "invitation" }, Error, { email: string; role: "ADMIN" | "MEMBER" }>>;
}) {
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card/45 p-4">
        <div>
          <h3 className="text-lg font-semibold tracking-normal">Project team</h3>
          <p className="text-sm text-muted-foreground">
            {selectedProject?.members.length ?? 0} people can collaborate in this project.
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
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {selectedProject?.members.map((member) => (
          <Card
            key={member.id}
            className="rounded-2xl border border-border bg-card/55 shadow-sm backdrop-blur-xl"
          >
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar className="size-10">
                  <AvatarImage src={member.user.image ?? undefined} />
                  <AvatarFallback>{initials(member.user)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {member.user.name ?? member.user.email}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {member.user.email}
                  </p>
                </div>
              </div>
              <Badge variant="outline">{member.role}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ReportsPanel({
  analytics,
  statusData,
  notifications,
}: {
  analytics: DashboardAnalytics;
  statusData: Array<{ name: string; value: number }>;
  notifications: DashboardNotification[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <StatusPanel statusData={statusData} />
      <PriorityPanel analytics={analytics} />
      <div className="lg:col-span-2">
        <NotificationPanel notifications={notifications} />
      </div>
    </div>
  );
}

function StatusPanel({
  statusData,
}: {
  statusData: Array<{ name: string; value: number }>;
}) {
  return (
    <Card className="rounded-2xl border border-border bg-card/55 shadow-sm backdrop-blur-xl">
      <CardHeader>
        <CardTitle>Status</CardTitle>
        <CardDescription>Current project flow</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[220px] w-full">
          <BarChart data={statusData}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="name" tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="value" radius={8}>
              {statusData.map((item) => (
                <Cell
                  key={item.name}
                  fill={statusColors[item.name] ?? "var(--chart-1)"}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function PriorityPanel({ analytics }: { analytics: DashboardAnalytics }) {
  return (
    <Card className="rounded-2xl border border-border bg-card/55 shadow-sm backdrop-blur-xl">
      <CardHeader>
        <CardTitle>Priority</CardTitle>
        <CardDescription>Workload distribution</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[220px] w-full">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent />} />
            <Pie
              data={analytics.priority}
              dataKey="value"
              nameKey="name"
              innerRadius={48}
              outerRadius={78}
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
  );
}

function NotificationPanel({
  notifications,
}: {
  notifications: DashboardNotification[];
}) {
  return (
    <Card className="rounded-2xl border border-border bg-card/55 shadow-sm backdrop-blur-xl">
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>Mentions and task events</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {notifications.slice(0, 5).map((notification) => (
          <div
            key={notification.id}
            className="rounded-xl border border-border bg-background/50 p-3"
          >
            <p className="text-sm font-medium">{notification.title}</p>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {notification.body}
            </p>
          </div>
        ))}
        {!notifications.length ? (
          <p className="text-sm text-muted-foreground">No notifications yet.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ProjectDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  trigger = (
    <Button size="sm" variant="outline">
      <Plus data-icon="inline-start" />
      New project
    </Button>
  ),
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: { name: string; description?: string }) => void;
  isPending: boolean;
  trigger?: ReactElement | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger render={trigger} /> : null}
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
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <Users data-icon="inline-start" />
        Add people
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add team member</DialogTitle>
          <DialogDescription>
            Invite by email or update an existing user. Admin role requires a global Admin.
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
            Send invite
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
