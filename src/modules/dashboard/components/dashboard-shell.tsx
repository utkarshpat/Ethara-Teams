"use client";

import type { Priority, TaskStatus } from "@prisma/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  BarChart3,
  Bell,
  CalendarDays,
  CheckCheck,
  CheckCircle2,
  ChevronDown,
  Crown,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Mail,
  MessageSquare,
  Plus,
  Search,
  ShieldCheck,
  ShieldOff,
  Timer,
  Trash2,
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
import {
  ProjectChat,
  type ProjectMessagesData,
  upsertProjectMessage,
} from "@/modules/dashboard/components/project-chat";
import { TaskSheet } from "@/modules/dashboard/components/task-sheet";
import type {
  DashboardAnalytics,
  DashboardAdminRequest,
  DashboardTrash,
  DashboardNotification,
  DashboardProjectMessage,
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

type MemberMutationResult = {
  kind: "member";
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
  { label: "Trash", icon: Trash2, view: "trash", href: "/dashboard/trash" },
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
    overview: "Workspace",
    board: "Tasks",
    calendar: "Calendar",
    chat: "Chat",
    reports: "Reports",
    team: "Team",
    trash: "Trash",
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
    "project:message_created": (payload) => {
      const message = payload as DashboardProjectMessage;

      if (message.projectId === selectedProjectId) {
        queryClient.setQueryData<ProjectMessagesData>(
          ["project-messages", selectedProjectId],
          (current) => upsertProjectMessage(current, message),
        );
      }

      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    "notifications:changed": () => {
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

  const trashQuery = useQuery({
    queryKey: ["trash"],
    queryFn: () => fetchJson<DashboardTrash>("/api/trash"),
    enabled: activeView === "trash",
  });

  const adminRequestsQuery = useQuery({
    queryKey: ["admin-requests"],
    queryFn: () => fetchJson<DashboardAdminRequest[]>("/api/admin-requests"),
    enabled: activeView === "team",
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
      fetchJson<MemberMutationResult>(
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
      toast.success(result.kind === "member" ? "Member updated" : "Done");
    },
    onError: (error) => toast.error(error.message),
  });

  const adminRequestMutation = useMutation({
    mutationFn: (payload: { message?: string }) =>
      fetchJson<DashboardAdminRequest>("/api/admin-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-requests"] });
      toast.success("Admin request sent");
    },
    onError: (error) => toast.error(error.message),
  });

  const adminReviewMutation = useMutation({
    mutationFn: (payload: {
      requestId: string;
      status: "APPROVED" | "REJECTED";
    }) =>
      fetchJson<DashboardAdminRequest>(
        `/api/admin-requests/${payload.requestId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: payload.status }),
        },
      ),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-requests"] }),
        queryClient.invalidateQueries({ queryKey: ["projects"] }),
        queryClient.invalidateQueries({ queryKey: ["notifications"] }),
      ]);
      toast.success("Admin request reviewed");
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

  const markNotificationsMutation = useMutation({
    mutationFn: (ids: string[]) =>
      fetchJson<{ count: number }>("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, read: true }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Notification marked as read");
    },
    onError: (error) => toast.error(error.message),
  });

  const restoreMutation = useMutation({
    mutationFn: (payload: { type: "project" | "task"; id: string }) =>
      fetchJson<{ id: string; type: "project" | "task"; restored: boolean }>(
        "/api/trash",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      ),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["trash"] }),
        queryClient.invalidateQueries({ queryKey: ["projects"] }),
        queryClient.invalidateQueries({ queryKey: ["tasks", selectedProjectId] }),
        queryClient.invalidateQueries({ queryKey: ["analytics", selectedProjectId] }),
      ]);
      toast.success("Item restored");
    },
    onError: (error) => toast.error(error.message),
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
            notifications={notificationsQuery.data}
            onMarkRead={(id) => markNotificationsMutation.mutate([id])}
            isMarkingRead={markNotificationsMutation.isPending}
          />

          <ScrollArea className="min-h-0 flex-1">
            <div className="flex min-w-0 flex-col p-4 lg:p-5">
              <Card className="min-h-[calc(100vh-7.5rem)] overflow-hidden rounded-2xl border border-border bg-card/50 shadow-sm backdrop-blur-xl">
                <CardHeader className="border-b border-border/70 px-4 py-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <CardTitle className="truncate">
                        {viewLabel(activeView)}
                      </CardTitle>
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
                      currentUserId={currentUser.id}
                    />
                  ) : null}
                  {activeView === "reports" ? (
                    <ReportsPanel analytics={analytics} statusData={statusData} />
                  ) : null}
                  {activeView === "team" ? (
                    <TeamPanel
                      currentUser={currentUser}
                      selectedProject={selectedProject}
                      canManageProject={canManageProject}
                      isMemberDialogOpen={isMemberDialogOpen}
                      setMemberDialogOpen={setMemberDialogOpen}
                      memberMutation={memberMutation}
                      adminRequests={adminRequestsQuery.data ?? []}
                      isLoadingAdminRequests={adminRequestsQuery.isLoading}
                      onRequestAdmin={(message) =>
                        adminRequestMutation.mutate({ message })
                      }
                      isRequestingAdmin={adminRequestMutation.isPending}
                      onReviewAdminRequest={(requestId, status) =>
                        adminReviewMutation.mutate({ requestId, status })
                      }
                      isReviewingAdmin={adminReviewMutation.isPending}
                    />
                  ) : null}
                  {activeView === "trash" ? (
                    <TrashPanel
                      trash={trashQuery.data}
                      isLoading={trashQuery.isLoading}
                      isRestoring={restoreMutation.isPending}
                      onRestore={(payload) => restoreMutation.mutate(payload)}
                    />
                  ) : null}
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </section>
      </div>

      <TaskSheet
        task={selectedTask}
        members={selectedProject?.members ?? []}
        tasks={boardTasks}
        currentUser={currentUser}
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
    <aside className="flex w-[58px] shrink-0 flex-col items-center gap-3 border-r border-white/10 bg-[#17082e]/90 px-2 py-3 text-white lg:w-[68px] lg:gap-4 lg:px-3 lg:py-4">
      <div className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-primary to-[#7e22ce] text-xs font-bold shadow-[0_0_28px_rgba(255,0,255,0.35)] lg:size-11 lg:text-sm">
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
                "relative grid size-10 place-items-center rounded-xl text-white/70 transition hover:bg-white/10 hover:text-white lg:size-11",
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
  memberMutation: ReturnType<typeof useMutation<MemberMutationResult, Error, { email: string; role: "ADMIN" | "MEMBER" }>>;
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
  const [isCollapsed, setCollapsed] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const projectName = selectedProject?.name ?? "No project";

  if (isCollapsed) {
    return (
      <aside className="hidden w-[56px] shrink-0 flex-col items-center border-r border-white/10 bg-gradient-to-b from-[#250a49]/94 via-[#16072e]/94 to-[#070311]/96 py-4 text-white shadow-2xl shadow-black/25 xl:flex">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="flex min-h-0 flex-1 flex-col items-center gap-3 rounded-2xl px-2 py-3 text-white/72 transition hover:bg-white/10 hover:text-white"
          aria-label="Expand workspace sidebar"
        >
          <span className="flex flex-col items-center gap-0.5 text-[10px] font-semibold uppercase leading-none tracking-normal text-white/48">
            {"workspace".split("").map((letter, index) => (
              <span key={`${letter}-${index}`}>{letter}</span>
            ))}
          </span>
          <span className="size-1.5 rounded-full bg-primary shadow-[0_0_14px_rgba(255,0,255,0.9)]" />
          <span className="[writing-mode:vertical-rl] rotate-180 truncate text-xs font-semibold">
            {projectName}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="mt-3 grid size-9 place-items-center rounded-xl border border-white/10 bg-white/[0.05] text-white/70 transition hover:border-primary/35 hover:text-primary"
          aria-label="Open project selector"
        >
          <ChevronDown className="size-4 rotate-90" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="hidden w-[224px] shrink-0 flex-col border-r border-white/10 bg-gradient-to-b from-[#250a49]/94 via-[#16072e]/94 to-[#070311]/96 text-white shadow-2xl shadow-black/25 xl:flex">
      <div className="flex items-start justify-between gap-2 px-4 pb-3 pt-4">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/42">
            Workspace
          </p>
          <h2 className="mt-1 truncate text-xl font-semibold tracking-normal">
            Ethara Teams
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="grid size-8 shrink-0 place-items-center rounded-lg text-white/60 transition hover:bg-white/10 hover:text-white"
          aria-label="Collapse workspace sidebar"
        >
          <ChevronDown className="size-4 rotate-90" />
        </button>
      </div>
      <ProjectDialog
        open={isProjectDialogOpen}
        onOpenChange={setProjectDialogOpen}
        onSubmit={(payload) => projectMutation.mutate(payload)}
        isPending={projectMutation.isPending}
        trigger={null}
      />

      <div className="flex flex-1 flex-col gap-4 px-3">
        <div className="rounded-2xl border border-primary/30 bg-primary/85 p-2.5 shadow-[0_0_24px_rgba(255,0,255,0.18)]">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/62">
                Selected project
              </p>
              <p className="mt-1 truncate text-sm font-semibold">
                {projectName}
              </p>
              <p className="mt-1 text-[11px] text-white/70">
                {selectedProject?.taskCount ?? 0} tasks / {selectedProject?.members.length ?? 0} members
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowMembers((value) => !value)}
              className={cn(
                "grid size-9 shrink-0 place-items-center rounded-xl border border-white/10 transition",
                showMembers
                  ? "bg-white text-primary"
                  : "bg-white/10 text-white/80 hover:bg-white/18 hover:text-white",
              )}
              aria-label="Show assigned members"
            >
              <Users className="size-4" />
            </button>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  aria-label="Ethara Teams"
                  className="mt-3 flex h-8 w-full items-center justify-between rounded-xl border border-white/10 bg-white/10 px-3 text-xs font-semibold text-white/86 transition hover:bg-white/18"
                />
              }
            >
              <span>Switch project</span>
              <ChevronDown className="size-4 text-white/75" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[300px] p-2">
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                Select a project
              </div>
              {projects.map((project) => (
                <DropdownMenuItem
                  key={project.id}
                  onClick={() => onProjectSelect(project.id)}
                  className="cursor-pointer gap-3 rounded-lg"
                >
                  <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">
                    {project.name.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {project.name}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {project.taskCount} tasks / {project.members.length} members
                    </span>
                  </span>
                  {project.id === selectedProjectId ? (
                    <Badge variant="outline">Active</Badge>
                  ) : null}
                </DropdownMenuItem>
              ))}
              {currentUser.role === "ADMIN" ? (
                <>
                  <Separator className="my-2" />
                  <DropdownMenuItem
                    onClick={(event) => {
                      event.preventDefault();
                      setProjectDialogOpen(true);
                    }}
                    className="cursor-pointer rounded-lg"
                  >
                    <Plus />
                    New project
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {selectedProject && canManageProject ? (
          <div className="grid gap-2">
            <TaskDialog
              open={isTaskDialogOpen}
              onOpenChange={setTaskDialogOpen}
              members={selectedProject.members}
              onSubmit={(payload) => taskMutation.mutate(payload)}
              isPending={taskMutation.isPending}
            />
            <MemberDialog
              open={isMemberDialogOpen}
              onOpenChange={setMemberDialogOpen}
              projectName={selectedProject.name}
              onSubmit={(payload) => memberMutation.mutate(payload)}
              isPending={memberMutation.isPending}
            />
          </div>
        ) : null}

        {showMembers ? (
          <div className="min-h-0 rounded-2xl border border-white/10 bg-white/[0.045] p-2">
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="text-xs font-semibold text-white/80">Assigned members</p>
              <Badge variant="outline">{selectedProject?.members.length ?? 0}</Badge>
            </div>
            <ScrollArea className="h-[280px]">
              <div className="grid gap-1.5 pr-2">
                {selectedProject?.members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between gap-2 rounded-xl bg-white/[0.06] px-2 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <Avatar className="size-7">
                        <AvatarImage src={member.user.image ?? undefined} />
                        <AvatarFallback>{initials(member.user)}</AvatarFallback>
                      </Avatar>
                      <span className="truncate text-xs text-white/86">
                        {member.user.name ?? member.user.email}
                      </span>
                    </div>
                    <span className="text-[9px] font-semibold text-white/45">
                      {member.role}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        ) : null}

        <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/42">
            Access
          </p>
          <p className="mt-1 text-sm font-semibold">
            {canManageProject ? "Project admin" : "Project member"}
          </p>
          <p className="mt-1 text-xs text-white/52">
            Team roster and member controls live in the Team page.
          </p>
        </div>
      </div>

      <div className="mt-auto border-t border-white/10 p-3">
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
  notifications,
  onMarkRead,
  isMarkingRead,
}: {
  currentUser: DashboardUser;
  roleLabel: string;
  unreadCount: number;
  notifications: DashboardNotification[];
  onMarkRead: (id: string) => void;
  isMarkingRead: boolean;
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
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="relative flex items-center gap-2 rounded-xl border border-border bg-background/60 px-3 py-2 text-sm transition hover:border-primary/30 hover:text-primary"
                aria-label="Open notifications"
              />
            }
          >
            <Bell />
            <span className="font-medium">{unreadCount}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[360px] max-w-[calc(100vw-2rem)] p-2">
            <div className="flex items-center justify-between px-2 py-2">
              <div>
                <p className="text-sm font-semibold">Notifications</p>
                <p className="text-xs text-muted-foreground">
                  Mentions, assignments, and project updates
                </p>
              </div>
              <Badge variant="outline">{unreadCount} unread</Badge>
            </div>
            <Separator className="my-2" />
            <div className="grid max-h-[360px] gap-2 overflow-y-auto">
              {notifications.slice(0, 8).map((notification) => (
                <div
                  key={notification.id}
                  className="rounded-xl border border-border bg-background/55 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="line-clamp-1 text-sm font-medium">
                        {notification.title}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {notification.body}
                      </p>
                    </div>
                    {!notification.read ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isMarkingRead}
                        onClick={() => onMarkRead(notification.id)}
                      >
                        <CheckCheck data-icon="inline-start" />
                        Read
                      </Button>
                    ) : (
                      <Badge variant="outline">Read</Badge>
                    )}
                  </div>
                </div>
              ))}
              {!notifications.length ? (
                <p className="px-2 py-8 text-center text-sm text-muted-foreground">
                  No notifications yet.
                </p>
              ) : null}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
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
  currentUser,
  selectedProject,
  canManageProject,
  isMemberDialogOpen,
  setMemberDialogOpen,
  memberMutation,
  adminRequests,
  isLoadingAdminRequests,
  onRequestAdmin,
  isRequestingAdmin,
  onReviewAdminRequest,
  isReviewingAdmin,
}: {
  currentUser: DashboardUser;
  selectedProject: DashboardProject | undefined;
  canManageProject: boolean;
  isMemberDialogOpen: boolean;
  setMemberDialogOpen: (open: boolean) => void;
  memberMutation: ReturnType<typeof useMutation<MemberMutationResult, Error, { email: string; role: "ADMIN" | "MEMBER" }>>;
  adminRequests: DashboardAdminRequest[];
  isLoadingAdminRequests: boolean;
  onRequestAdmin: (message: string) => void;
  isRequestingAdmin: boolean;
  onReviewAdminRequest: (
    requestId: string,
    status: "APPROVED" | "REJECTED",
  ) => void;
  isReviewingAdmin: boolean;
}) {
  const [adminRequestMessage, setAdminRequestMessage] = useState("");
  const pendingRequest = adminRequests.find(
    (request) =>
      request.user.id === currentUser.id && request.status === "PENDING",
  );

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
            projectName={selectedProject.name}
            onSubmit={(payload) => memberMutation.mutate(payload)}
            isPending={memberMutation.isPending}
          />
        ) : null}
      </div>
      {currentUser.role !== "ADMIN" ? (
        <Card className="rounded-2xl border border-border bg-card/55 shadow-sm backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Crown />
              Admin access
            </CardTitle>
            <CardDescription>
              Ask workspace admins to approve project and team management access.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Textarea
              value={adminRequestMessage}
              onChange={(event) => setAdminRequestMessage(event.target.value)}
              rows={3}
              placeholder="Why do you need admin access?"
              disabled={Boolean(pendingRequest) || isRequestingAdmin}
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Badge variant={pendingRequest ? "secondary" : "outline"}>
                {pendingRequest ? "Pending approval" : "No pending request"}
              </Badge>
              <Button
                type="button"
                size="sm"
                disabled={Boolean(pendingRequest) || isRequestingAdmin}
                onClick={() => onRequestAdmin(adminRequestMessage)}
              >
                <ShieldCheck data-icon="inline-start" />
                Request admin
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <AdminRequestsPanel
          requests={adminRequests}
          isLoading={isLoadingAdminRequests}
          onReview={onReviewAdminRequest}
          isReviewing={isReviewingAdmin}
        />
      )}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {selectedProject?.members.map((member) => (
          <Card
            key={member.id}
            className="rounded-2xl border border-border bg-card/55 shadow-sm backdrop-blur-xl"
          >
            <CardContent className="flex flex-col gap-3 p-4">
              <div className="flex items-center justify-between gap-3">
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
                <Badge variant={member.role === "ADMIN" ? "secondary" : "outline"}>
                  {member.role}
                </Badge>
              </div>
              {canManageProject && member.user.email ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={member.role === "ADMIN" ? "secondary" : "outline"}
                    disabled={memberMutation.isPending || member.role === "ADMIN"}
                    onClick={() =>
                      memberMutation.mutate({
                        email: member.user.email as string,
                        role: "ADMIN",
                      })
                    }
                  >
                    <ShieldCheck data-icon="inline-start" />
                    Make admin
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={
                      memberMutation.isPending ||
                      member.role === "MEMBER" ||
                      member.user.id === currentUser.id
                    }
                    onClick={() =>
                      memberMutation.mutate({
                        email: member.user.email as string,
                        role: "MEMBER",
                      })
                    }
                  >
                    <ShieldOff data-icon="inline-start" />
                    Make member
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function AdminRequestsPanel({
  requests,
  isLoading,
  onReview,
  isReviewing,
}: {
  requests: DashboardAdminRequest[];
  isLoading: boolean;
  onReview: (requestId: string, status: "APPROVED" | "REJECTED") => void;
  isReviewing: boolean;
}) {
  const pendingRequests = requests.filter((request) => request.status === "PENDING");

  return (
    <Card className="rounded-2xl border border-border bg-card/55 shadow-sm backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Crown />
          Admin requests
        </CardTitle>
        <CardDescription>Approve or reject teammates asking for admin access.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {isLoading ? (
          <div className="rounded-xl border border-dashed border-border bg-background/35 p-4 text-sm text-muted-foreground">
            Loading requests...
          </div>
        ) : null}
        {pendingRequests.map((request) => (
          <div
            key={request.id}
            className="flex flex-col gap-3 rounded-xl border border-border bg-background/45 p-3 md:flex-row md:items-center md:justify-between"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {request.user.name ?? request.user.email}
              </p>
              <p className="text-xs text-muted-foreground">
                {request.message || "No reason provided"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                disabled={isReviewing}
                onClick={() => onReview(request.id, "APPROVED")}
              >
                <ShieldCheck data-icon="inline-start" />
                Approve
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isReviewing}
                onClick={() => onReview(request.id, "REJECTED")}
              >
                <ShieldOff data-icon="inline-start" />
                Reject
              </Button>
            </div>
          </div>
        ))}
        {!isLoading && !pendingRequests.length ? (
          <div className="rounded-xl border border-dashed border-border bg-background/35 p-4 text-sm text-muted-foreground">
            No pending admin requests.
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ReportsPanel({
  analytics,
  statusData,
}: {
  analytics: DashboardAnalytics;
  statusData: Array<{ name: string; value: number }>;
}) {
  return (
    <div className="grid gap-4">
      <MetricStrip analytics={analytics} />
      <div className="grid gap-4 lg:grid-cols-2">
        <StatusPanel statusData={statusData} />
        <PriorityPanel analytics={analytics} />
      </div>
    </div>
  );
}

function TrashPanel({
  trash,
  isLoading,
  isRestoring,
  onRestore,
}: {
  trash: DashboardTrash | undefined;
  isLoading: boolean;
  isRestoring: boolean;
  onRestore: (payload: { type: "project" | "task"; id: string }) => void;
}) {
  const projects = trash?.projects ?? [];
  const tasks = trash?.tasks ?? [];

  return (
    <div className="grid gap-4">
      <div className="overflow-hidden rounded-2xl border border-border bg-card/50 shadow-sm backdrop-blur-xl">
        <div className="flex flex-col gap-4 border-b border-border/70 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl bg-primary/12 text-primary">
              <Trash2 />
            </div>
            <div>
              <h3 className="text-lg font-semibold tracking-normal">Trash recovery</h3>
              <p className="text-sm text-muted-foreground">
                Restore soft-deleted projects and tasks without losing delivery history.
              </p>
            </div>
          </div>
          <Badge variant="outline" className="mono-meta">
            {projects.length + tasks.length} archived
          </Badge>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-3">
          <TrashStat label="Deleted projects" value={projects.length} />
          <TrashStat label="Deleted tasks" value={tasks.length} />
          <TrashStat
            label="Restorable now"
            value={
              projects.filter((project) => project.canRestore).length +
              tasks.filter((task) => task.canRestore && !task.projectDeletedAt).length
            }
          />
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/35 p-8 text-center text-sm text-muted-foreground">
          Loading trash...
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <TrashSection
          title="Deleted projects"
          empty="No deleted projects."
          items={projects.map((project) => ({
            id: project.id,
            type: "project" as const,
            title: project.name,
            meta: `${project.taskCount} tasks / ${project.memberCount} members`,
            deletedAt: project.deletedAt,
            canRestore: project.canRestore,
            blockedReason: null,
          }))}
          isRestoring={isRestoring}
          onRestore={onRestore}
        />
        <TrashSection
          title="Deleted tasks"
          empty="No deleted tasks."
          items={tasks.map((task) => ({
            id: task.id,
            type: "task" as const,
            title: task.title,
            meta: `${task.projectName} / ${task.status.replace("_", " ")} / ${task.priority}`,
            deletedAt: task.deletedAt,
            canRestore: task.canRestore && !task.projectDeletedAt,
            blockedReason: task.projectDeletedAt
              ? "Restore parent project first"
              : null,
          }))}
          isRestoring={isRestoring}
          onRestore={onRestore}
        />
      </div>
    </div>
  );
}

function TrashStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-background/45 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-normal">{value}</p>
    </div>
  );
}

function TrashSection({
  title,
  empty,
  items,
  isRestoring,
  onRestore,
}: {
  title: string;
  empty: string;
  items: Array<{
    id: string;
    type: "project" | "task";
    title: string;
    meta: string;
    deletedAt: string | null;
    canRestore: boolean;
    blockedReason: string | null;
  }>;
  isRestoring: boolean;
  onRestore: (payload: { type: "project" | "task"; id: string }) => void;
}) {
  return (
    <Card className="overflow-hidden rounded-2xl border border-border bg-card/55 shadow-sm backdrop-blur-xl">
      <CardHeader className="border-b border-border/70">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>Soft-deleted items remain recoverable.</CardDescription>
          </div>
          <Badge variant="outline">{items.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        {items.map((item) => (
          <div
            key={`${item.type}-${item.id}`}
            className="flex flex-col gap-3 rounded-2xl border border-border bg-background/50 p-3 transition hover:border-primary/30 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-semibold">{item.title}</p>
                <Badge variant="outline">{item.type}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{item.meta}</p>
              <p className="mono-meta mt-1 text-[11px] text-muted-foreground">
                Deleted {item.deletedAt ? new Date(item.deletedAt).toLocaleString() : "recently"}
              </p>
              {item.blockedReason ? (
                <p className="mt-2 text-xs text-primary">{item.blockedReason}</p>
              ) : null}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              disabled={!item.canRestore || isRestoring}
              onClick={() => onRestore({ type: item.type, id: item.id })}
            >
              <CheckCircle2 data-icon="inline-start" />
              Restore
            </Button>
          </div>
        ))}
        {!items.length ? (
          <div className="rounded-xl border border-dashed border-border bg-background/35 p-6 text-center text-sm text-muted-foreground">
            {empty}
          </div>
        ) : null}
      </CardContent>
    </Card>
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
  projectName,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName: string;
  onSubmit: (payload: { email: string; role: "ADMIN" | "MEMBER" }) => void;
  isPending: boolean;
}) {
  const [role, setRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [email, setEmail] = useState("");

  function openManualMailDraft() {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      toast.error("Enter an email first");
      return;
    }

    const registerUrl = `${window.location.origin}/register?email=${encodeURIComponent(normalizedEmail)}`;
    const subject = `Invitation to ${projectName}`;
    const body = [
      "Hi,",
      "",
      `I am inviting you to join ${projectName} on Ethara Teams as ${role}.`,
      "",
      `Create your account here: ${registerUrl}`,
      "",
      "After you sign up, reply to this email so I can add your account to the team.",
      "",
      "Thanks",
    ].join("\n");
    const gmailUrl = new URL("https://mail.google.com/mail/");
    gmailUrl.searchParams.set("view", "cm");
    gmailUrl.searchParams.set("fs", "1");
    gmailUrl.searchParams.set("to", normalizedEmail);
    gmailUrl.searchParams.set("su", subject);
    gmailUrl.searchParams.set("body", body);

    window.open(gmailUrl.toString(), "_blank", "noopener,noreferrer");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <Users data-icon="inline-start" />
        Add people
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add existing member</DialogTitle>
          <DialogDescription>
            Update an existing account, or open a prefilled email draft for someone new.
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
              <Input
                id="member-email"
                name="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
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
          <div className="grid gap-2 sm:grid-cols-2">
            <Button type="submit" disabled={isPending}>
              <ShieldCheck data-icon="inline-start" />
              Add existing user
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={openManualMailDraft}
            >
              <Mail data-icon="inline-start" />
              Open mail draft
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
