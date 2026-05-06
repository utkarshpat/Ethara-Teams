import {
  ArrowRight,
  Bell,
  CheckCircle2,
  CircleDot,
  LayoutDashboard,
  LockKeyhole,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const capabilities = [
  {
    title: "Protected project workspaces",
    body: "Every task, member, message, and metric is scoped through project membership rules.",
    icon: ShieldCheck,
  },
  {
    title: "Task-level conversations",
    body: "Execution context stays inside the task, with mentions and notifications built in.",
    icon: MessageSquare,
  },
  {
    title: "Operational visibility",
    body: "Status, priority, overdue work, and assignment ownership stay visible from the dashboard.",
    icon: LayoutDashboard,
  },
];

const workflow = [
  ["Plan", "Create projects and assign accountable owners."],
  ["Coordinate", "Discuss blockers in project and task threads."],
  ["Execute", "Move work across the board with role-aware controls."],
  ["Review", "Track delivery health before deadlines slip."],
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden">
      <section className="relative min-h-screen px-5 py-6 sm:px-8">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-7xl flex-col">
          <nav className="flex items-center justify-between gap-6">
            <Link href="/" className="flex items-center gap-3 text-base font-semibold tracking-normal">
              <span className="grid size-10 place-items-center rounded-md bg-primary text-sm text-primary-foreground shadow-[0_0_24px_rgba(255,0,255,0.35)]">
                ET
              </span>
              Ethara Teams
            </Link>
            <div className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
              <a href="#platform" className="transition hover:text-foreground">
                Platform
              </a>
              <a href="#security" className="transition hover:text-foreground">
                Security
              </a>
              <a href="#workflow" className="transition hover:text-foreground">
                Workflow
              </a>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/login" className={buttonVariants({ variant: "outline" })}>
                Sign in
              </Link>
              <Link href="/register" className={cn(buttonVariants(), "hidden sm:inline-flex")}>
                Start workspace
              </Link>
            </div>
          </nav>

          <div className="grid flex-1 items-center gap-12 py-12 lg:grid-cols-[0.86fr_1.14fr] lg:py-16">
            <div className="flex max-w-2xl flex-col gap-8">
              <div className="flex flex-col gap-6">
                <h1 className="text-5xl font-bold leading-[0.95] text-foreground sm:text-6xl lg:text-7xl">
                  Ethara Teams
                </h1>
                <p className="max-w-xl text-lg leading-8 text-muted-foreground">
                  A secure team operations platform for project ownership, task
                  assignment, role-based execution, and real-time collaboration
                  in one installable workspace.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/register" className={buttonVariants({ size: "lg" })}>
                  Create workspace
                  <ArrowRight data-icon="inline-end" />
                </Link>
                <Link
                  href="/login"
                  className={buttonVariants({ size: "lg", variant: "outline" })}
                >
                  Sign in
                </Link>
              </div>
              <div className="grid gap-3 border-l border-white/10 pl-5 text-sm text-muted-foreground">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="size-4 text-primary" />
                  Admin and Member roles enforced across services and UI.
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="size-4 text-primary" />
                  Real-time project and task communication with notifications.
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="size-4 text-primary" />
                  Installable workspace for fast access across desktop and mobile.
                </div>
              </div>
            </div>

            <div className="glass-panel cyber-grid relative overflow-hidden rounded-lg p-3 shadow-[0_32px_120px_rgba(0,0,0,0.45)]">
              <div className="rounded-md border border-white/10 bg-[#030712]/88">
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
                      ET
                    </span>
                    <div>
                      <p className="text-sm font-semibold">Operations Workspace</p>
                      <p className="mono-meta text-xs text-muted-foreground">Private project boundary</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-md border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-300">
                    <CircleDot className="size-3" />
                    Live sync
                  </div>
                </div>
                <div className="grid gap-0 lg:grid-cols-[220px_1fr]">
                  <aside className="border-b border-white/10 p-4 lg:border-b-0 lg:border-r">
                    <div className="mb-5 flex items-center justify-between">
                      <p className="text-sm font-semibold">Projects</p>
                      <span className="mono-meta text-xs text-muted-foreground">4 active</span>
                    </div>
                    <div className="grid gap-2">
                      {["Product Operations", "Client Delivery", "Platform Reliability"].map((project, index) => (
                        <div
                          key={project}
                          className={cn(
                            "rounded-md border px-3 py-3 text-sm",
                            index === 0
                              ? "border-primary/55 bg-primary/12 text-foreground"
                              : "border-white/10 bg-white/[0.03] text-muted-foreground",
                          )}
                        >
                          <p className="truncate font-medium">{project}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{index + 3} members</p>
                        </div>
                      ))}
                    </div>
                  </aside>
                  <div className="p-4 sm:p-5">
                    <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                      <div>
                        <h2 className="text-xl font-semibold tracking-normal">Product Operations</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Tasks, conversations, owners, and delivery signals.
                        </p>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        {[
                          ["24", "tasks"],
                          ["6", "overdue"],
                          ["91%", "owned"],
                        ].map(([value, label]) => (
                          <div key={label} className="rounded-md border border-white/10 bg-[#11182766] px-3 py-2">
                            <p className="text-sm font-semibold">{value}</p>
                            <p className="mono-meta text-[10px] text-muted-foreground">{label}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      {[
                        ["Todo", "Review onboarding tasks", "Aarav", "HIGH"],
                        ["In Progress", "Resolve release blockers", "Mira", "URGENT"],
                        ["Review", "Approve client handoff", "Team", "MEDIUM"],
                      ].map(([state, title, owner, priority]) => (
                        <div key={state} className="rounded-md border-t-2 border-t-primary bg-[#11182766] p-3 backdrop-blur-xl">
                          <div className="mb-3 flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase text-muted-foreground">{state}</p>
                            <LockKeyhole className="size-3 text-muted-foreground" />
                          </div>
                          <div className="rounded-md border border-white/10 bg-[#030712]/70 p-3">
                            <p className="text-sm font-semibold leading-5">{title}</p>
                            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                              <span>{owner}</span>
                              <span className="rounded-sm border border-primary/30 bg-primary/10 px-2 py-1 text-primary">
                                {priority}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-[1fr_0.72fr]">
                      <div className="rounded-md border border-white/10 bg-[#11182766] p-4">
                        <div className="mb-3 flex items-center gap-2">
                          <MessageSquare className="size-4 text-primary" />
                          <p className="text-sm font-semibold">Task thread</p>
                        </div>
                        <div className="space-y-2 text-sm text-muted-foreground">
                          <p>Tagging @mira here so the owner gets the blocker before review.</p>
                          <p className="mono-meta text-xs text-primary">Notification delivered</p>
                        </div>
                      </div>
                      <div className="rounded-md border border-white/10 bg-[#11182766] p-4">
                        <div className="mb-3 flex items-center gap-2">
                          <Bell className="size-4 text-primary" />
                          <p className="text-sm font-semibold">Alerts</p>
                        </div>
                        <div className="space-y-2 text-xs text-muted-foreground">
                          <p>2 mentions awaiting review</p>
                          <p>3 high-priority tasks due this week</p>
                          <p>1 assignment changed by Admin</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="platform" className="border-y border-white/10 bg-[#030712]/55 px-5 py-20 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-3">
          {capabilities.map((capability) => (
            <article key={capability.title} className="glass-panel rounded-lg p-6">
              <capability.icon className="mb-5 size-6 text-primary" />
              <h2 className="text-lg font-semibold tracking-normal">{capability.title}</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{capability.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="security" className="px-5 py-20 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.82fr_1.18fr]">
          <div>
            <h2 className="text-3xl font-bold leading-tight md:text-4xl">
              Designed around project boundaries, not loose task lists.
            </h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-muted-foreground">
              Ethara Teams keeps authorization, ownership, and collaboration
              aligned so each project remains private to its members and
              actionable for its owners.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["Admin controls", "Manage projects, members, assignments, and task structure."],
              ["Member execution", "Move assigned work, comment in context, and receive updates."],
              ["Soft deletion", "Recoverable project and task lifecycle for safer operations."],
              ["Structured logs", "Production-readable events for auth, analytics, and realtime flows."],
            ].map(([title, body]) => (
              <div key={title} className="rounded-md border border-white/10 bg-[#11182766] p-5">
                <h3 className="text-sm font-semibold tracking-normal">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="px-5 pb-24 sm:px-8">
        <div className="mx-auto max-w-7xl rounded-lg border border-white/10 bg-[#11182766] p-6 backdrop-blur-xl sm:p-8">
          <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h2 className="text-3xl font-bold tracking-normal">Execution workflow</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
                A clear path from planning to delivery without switching tools
                for task context, team ownership, and project communication.
              </p>
            </div>
            <Link href="/register" className={buttonVariants({ variant: "outline" })}>
              Start with Ethara
            </Link>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            {workflow.map(([title, body], index) => (
              <div key={title} className="rounded-md border border-white/10 bg-[#030712]/72 p-5">
                <p className="mono-meta text-xs text-primary">0{index + 1}</p>
                <h3 className="mt-4 text-base font-semibold tracking-normal">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
