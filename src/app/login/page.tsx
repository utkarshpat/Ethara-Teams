import type { Metadata } from "next";
import { ArrowUpRight, Bell, CheckCircle2, Clock3 } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/modules/auth/components/login-form";

export const metadata: Metadata = {
  title: "Login",
};

export default function LoginPage() {
  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <section className="glass-panel cyber-grid mx-auto grid min-h-[calc(100vh-2.5rem)] w-full max-w-6xl overflow-hidden rounded-lg lg:grid-cols-[1.06fr_0.94fr]">
        <div className="relative hidden border-r border-white/10 bg-[#030712]/70 p-8 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-primary via-[#7e22ce] to-transparent" />
          <Link href="/" className="flex items-center gap-3 text-base font-semibold tracking-normal">
            <span className="grid size-9 place-items-center rounded-md bg-primary text-sm text-primary-foreground shadow-[0_0_20px_rgba(255,0,255,0.35)]">
              ET
            </span>
            Ethara Teams
          </Link>
          <div className="flex flex-col gap-6">
            <div className="flex max-w-xl flex-col gap-4">
              <h1 className="text-4xl font-bold leading-tight">
                Project control with task-level community built in.
              </h1>
              <p className="max-w-lg text-sm leading-6 text-muted-foreground">
                A focused workspace for assigning, discussing, and shipping
                work without losing the project boundary.
              </p>
            </div>
            <div className="grid gap-3">
              <div className="rounded-md border border-white/10 bg-[#11182766] p-4 backdrop-blur-xl">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm font-medium">Ethara Launch Sprint</p>
                  <span className="mono-meta rounded-sm bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground">
                    LIVE
                  </span>
                </div>
                <div className="grid gap-3">
                  {[
                    ["Review chat presence", "Mira", "In Progress"],
                    ["Finalize Railway deploy", "Aarav", "Review"],
                    ["Polish dashboard metrics", "Aarav", "Todo"],
                  ].map(([title, owner, state]) => (
                    <div
                      key={title}
                      className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-[#030712]/75 p-3 text-foreground"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{title}</p>
                        <p className="mono-meta text-xs text-muted-foreground">{owner}</p>
                      </div>
                      <span className="rounded-sm border border-primary/25 bg-primary/10 px-2 py-1 text-xs text-primary">
                        {state}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-md border border-white/10 bg-[#11182766] p-3 backdrop-blur-xl">
                  <CheckCircle2 className="mb-3 text-primary" />
                  <p className="text-lg font-semibold">82%</p>
                  <p className="text-xs text-muted-foreground">Completion</p>
                </div>
                <div className="rounded-md border border-white/10 bg-[#11182766] p-3 backdrop-blur-xl">
                  <Bell className="mb-3 text-[#a855f7]" />
                  <p className="text-lg font-semibold">14</p>
                  <p className="text-xs text-muted-foreground">Mentions</p>
                </div>
                <div className="rounded-md border border-white/10 bg-[#11182766] p-3 backdrop-blur-xl">
                  <Clock3 className="mb-3 text-[#38bdf8]" />
                  <p className="text-lg font-semibold">3</p>
                  <p className="text-xs text-muted-foreground">Overdue</p>
                </div>
              </div>
            </div>
          </div>
          <p className="mono-meta text-xs text-muted-foreground">
            Demo access: admin@ethara.dev or member@ethara.dev / Password@123
          </p>
        </div>
        <div className="flex min-h-[720px] flex-col justify-center bg-[#030712]/40 p-6 sm:p-10">
          <div className="mx-auto flex w-full max-w-md flex-col gap-8">
            <div className="flex items-center justify-between gap-4 lg:hidden">
              <Link href="/" className="flex items-center gap-3 text-base font-semibold tracking-normal">
                <span className="grid size-9 place-items-center rounded-md bg-primary text-sm text-primary-foreground">
                  ET
                </span>
                Ethara Teams
              </Link>
              <Link href="/" className="text-sm text-muted-foreground">
                Home
              </Link>
            </div>
            <div className="flex flex-col gap-3">
              <div className="mono-meta inline-flex w-fit items-center gap-2 rounded-md border border-white/10 bg-primary/10 px-3 py-2 text-xs font-medium text-primary">
                Production workspace
                <ArrowUpRight />
              </div>
              <div className="flex flex-col gap-2">
                <h2 className="text-3xl font-bold text-foreground">
                  Welcome back
                </h2>
                <p className="text-sm leading-6 text-muted-foreground">
                  Sign in to open your project dashboard, Kanban board, and task threads.
                </p>
              </div>
            </div>
            <Suspense>
              <LoginForm />
            </Suspense>
          </div>
        </div>
      </section>
    </main>
  );
}
