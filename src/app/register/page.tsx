import type { Metadata } from "next";
import { CheckCircle2, ShieldCheck, UsersRound } from "lucide-react";
import Link from "next/link";
import { RegisterForm } from "@/modules/auth/components/register-form";

export const metadata: Metadata = {
  title: "Create account",
};

export default function RegisterPage() {
  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <section className="glass-panel cyber-grid mx-auto grid min-h-[calc(100vh-2.5rem)] w-full max-w-6xl overflow-hidden rounded-lg lg:grid-cols-[0.94fr_1.06fr]">
        <div className="flex flex-col justify-center bg-[#030712]/40 p-6 sm:p-10">
          <div className="mx-auto flex w-full max-w-md flex-col gap-7">
            <div className="flex flex-col gap-3">
              <Link href="/" className="flex items-center gap-3 text-base font-semibold tracking-normal">
                <span className="grid size-10 place-items-center rounded-md bg-primary text-sm text-primary-foreground shadow-[0_0_20px_rgba(255,0,255,0.35)]">
                  ET
                </span>
                Ethara Teams
              </Link>
              <div className="pt-4">
                <h1 className="text-3xl font-bold text-foreground">
                  Create your Ethara account
                </h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Join your team workspace with Google or organization email.
                </p>
              </div>
            </div>
            <RegisterForm />
          </div>
        </div>
        <div className="relative hidden border-l border-white/10 bg-[#030712]/72 p-8 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-primary via-[#7e22ce] to-transparent" />
          <div className="flex flex-col gap-5">
            <div className="grid size-12 place-items-center rounded-md bg-primary/15 text-primary">
              <UsersRound />
            </div>
            <h2 className="max-w-md text-4xl font-bold leading-tight">
              Bring project ownership, execution, and communication into one workspace.
            </h2>
            <p className="max-w-md text-sm leading-6 text-muted-foreground">
              Ethara Teams gives growing teams a single place to structure work,
              protect project access, and collaborate at the task level.
            </p>
          </div>
          <div className="grid gap-3">
            {[
              ["Workspace-ready roles", "Admin and Member access flows are separated from the start."],
              ["Google sign-in", "Use a familiar identity provider for faster onboarding."],
              ["Delivery context", "Projects, tasks, comments, and notifications stay connected."],
            ].map(([title, body]) => (
              <div key={title} className="flex items-start gap-3 rounded-md border border-white/10 bg-[#11182766] p-4 text-sm backdrop-blur-xl">
                <CheckCircle2 className="mt-0.5 size-5 text-primary" />
                <div>
                  <p className="font-semibold">{title}</p>
                  <p className="mt-1 leading-6 text-muted-foreground">{body}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <ShieldCheck className="size-5 text-primary" />
            Project membership checks protect every workspace boundary.
          </div>
        </div>
      </section>
    </main>
  );
}
