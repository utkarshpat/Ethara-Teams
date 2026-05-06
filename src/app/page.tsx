import {
  ArrowRight,
  Bell,
  CheckCircle2,
  LayoutDashboard,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

const features = [
  {
    title: "Project-safe RBAC",
    body: "Admin and member permissions are enforced through shared project membership guards.",
    icon: ShieldCheck,
  },
  {
    title: "Realtime task threads",
    body: "Every task carries its own chat context with mentions and notification fanout.",
    icon: MessageSquare,
  },
  {
    title: "Execution dashboard",
    body: "Status, priority, and overdue analytics stay close to the Kanban board.",
    icon: LayoutDashboard,
  },
];

export default function Home() {
  return (
    <main className="min-h-screen">
      <section className="mx-auto grid min-h-screen w-full max-w-7xl items-center gap-10 px-6 py-8 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="flex flex-col gap-8">
          <nav className="flex items-center justify-between">
            <Link href="/" className="text-xl font-semibold tracking-normal">
              Ethara Teams
            </Link>
            <Link href="/login" className={buttonVariants({ variant: "outline" })}>
              Sign in
            </Link>
          </nav>
          <div className="flex flex-col gap-6">
            <h1 className="max-w-2xl text-5xl font-bold leading-tight text-foreground md:text-6xl">
              Collaborate. Execute. Scale.
            </h1>
            <p className="max-w-xl text-base leading-7 text-muted-foreground">
              A full-stack modular monolith for teams to create projects,
              assign tasks, discuss execution, and track progress from one
              installable workspace.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/dashboard" className={buttonVariants({ size: "lg" })}>
                Open dashboard
                <ArrowRight data-icon="inline-end" />
              </Link>
              <Link
                href="/register"
                className={buttonVariants({ size: "lg", variant: "outline" })}
              >
                Create account
              </Link>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {features.map((feature) => (
              <article key={feature.title} className="glass-panel rounded-lg p-4">
                <feature.icon className="mb-4 text-primary" />
                <h2 className="text-sm font-semibold tracking-normal">
                  {feature.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {feature.body}
                </p>
              </article>
            ))}
          </div>
        </div>
        <div className="glass-panel cyber-grid overflow-hidden rounded-lg p-4">
          <div className="rounded-md border border-white/10 bg-[#030712]/78 p-5 text-white">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="mono-meta text-sm text-muted-foreground">Ethara Launch Sprint</p>
                <h2 className="text-2xl font-semibold tracking-normal">
                  Project command center
                </h2>
              </div>
              <div className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-[0_0_20px_rgba(255,0,255,0.3)]">
                PWA Ready
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-[1fr_0.78fr]">
              <div className="grid gap-3">
                {["Todo", "In Progress", "Review"].map((column, index) => (
                  <div key={column} className="rounded-md border border-white/10 bg-[#11182766] p-4 backdrop-blur-xl">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-medium">{column}</p>
                      <span className="mono-meta text-xs text-muted-foreground">{index + 2} tasks</span>
                    </div>
                    <div className="rounded-md border border-white/10 bg-[#030712]/75 p-4 text-foreground">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium">
                          {index === 0
                            ? "Wire project guard"
                            : index === 1
                              ? "Ship task-level chat"
                              : "Verify Railway deploy"}
                        </p>
                        <CheckCircle2 className="text-primary" />
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Assigned, validated, and tracked with realtime context.
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid gap-4">
                <div className="rounded-md border border-white/10 bg-[#11182766] p-4 backdrop-blur-xl">
                  <p className="text-sm text-muted-foreground">Priority mix</p>
                  <div className="mt-4 grid grid-cols-4 items-end gap-2">
                    {[52, 78, 44, 66].map((height, index) => (
                      <div key={height} className="flex flex-col items-center gap-2">
                        <div
                          className="w-full rounded-sm bg-gradient-to-t from-[#7e22ce] to-primary shadow-[0_0_16px_rgba(255,0,255,0.22)]"
                          style={{ height }}
                        />
                        <span className="mono-meta text-xs text-muted-foreground">
                          {["L", "M", "H", "U"][index]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-md border border-white/10 bg-[#11182766] p-4 backdrop-blur-xl">
                  <div className="flex items-center gap-3">
                    <Bell className="text-primary" />
                    <div>
                      <p className="text-sm font-medium">Mention created</p>
                      <p className="text-xs text-muted-foreground">
                        @mira was notified inside a task thread.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
