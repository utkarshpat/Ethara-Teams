import type { Metadata } from "next";
import { ArrowUpRight, CheckCircle2, KeyRound, LockKeyhole, MessageSquare } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { LoginForm } from "@/modules/auth/components/login-form";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <section className="glass-panel cyber-grid mx-auto grid min-h-[calc(100vh-2.5rem)] w-full max-w-6xl overflow-hidden rounded-lg lg:grid-cols-[1fr_0.92fr]">
        <div className="relative hidden border-r border-white/10 bg-[#030712]/72 p-8 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-primary via-[#7e22ce] to-transparent" />
          <Link href="/" className="flex items-center gap-3 text-base font-semibold tracking-normal">
            <span className="grid size-10 place-items-center rounded-md bg-primary text-sm text-primary-foreground shadow-[0_0_20px_rgba(255,0,255,0.35)]">
              ET
            </span>
            Ethara Teams
          </Link>
          <div className="absolute right-8 top-8">
            <ThemeToggle />
          </div>
          <div className="flex flex-col gap-8">
            <div className="flex max-w-xl flex-col gap-4">
              <h1 className="text-4xl font-bold leading-tight">
                Secure access for team operations.
              </h1>
              <p className="max-w-lg text-sm leading-6 text-muted-foreground">
                Sign in to manage project boundaries, assign work, respond to
                task conversations, and keep delivery status visible.
              </p>
            </div>
            <div className="grid gap-3">
              {[
                ["Role-aware controls", "Admin actions stay separated from member execution."],
                ["Task conversations", "Comments, mentions, and notifications stay tied to work."],
                ["Project analytics", "Status, priority, and overdue signals stay visible."],
              ].map(([title, body]) => (
                <div key={title} className="flex items-start gap-3 rounded-md border border-white/10 bg-[#11182766] p-4 backdrop-blur-xl">
                  <CheckCircle2 className="mt-0.5 size-5 text-primary" />
                  <div>
                    <p className="text-sm font-semibold">{title}</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-md border border-white/10 bg-[#11182766] p-3 backdrop-blur-xl">
              <LockKeyhole className="mb-3 text-primary" />
              <p className="text-xs text-muted-foreground">Private projects</p>
            </div>
            <div className="rounded-md border border-white/10 bg-[#11182766] p-3 backdrop-blur-xl">
              <MessageSquare className="mb-3 text-[#a855f7]" />
              <p className="text-xs text-muted-foreground">Context threads</p>
            </div>
            <div className="rounded-md border border-white/10 bg-[#11182766] p-3 backdrop-blur-xl">
              <KeyRound className="mb-3 text-[#38bdf8]" />
              <p className="text-xs text-muted-foreground">Google OAuth</p>
            </div>
          </div>
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
              <ThemeToggle />
            </div>
            <div className="flex flex-col gap-3">
              <div className="mono-meta inline-flex w-fit items-center gap-2 rounded-md border border-white/10 bg-primary/10 px-3 py-2 text-xs font-medium text-primary">
                Secure workspace access
                <ArrowUpRight />
              </div>
              <div className="flex flex-col gap-2">
                <h2 className="text-3xl font-bold text-foreground">
                  Sign in to Ethara
                </h2>
                <p className="text-sm leading-6 text-muted-foreground">
                  Continue with Google or use your organization email.
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
