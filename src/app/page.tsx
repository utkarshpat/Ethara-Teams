import {
  ArrowRight,
  LayoutDashboard,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
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
            <div className="hidden items-center gap-8 text-sm text-muted-foreground md:flex" />
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Link href="/login" className={buttonVariants({ variant: "outline" })}>
                Sign in
              </Link>
              <Link href="/register" className={cn(buttonVariants(), "hidden sm:inline-flex")}>
                Start workspace
              </Link>
            </div>
          </nav>

          <div className="grid flex-1 items-center gap-12 py-8 lg:grid-cols-2 lg:py-10">
            <div className="hidden lg:flex flex-col gap-6 pr-8 animate-in fade-in slide-in-from-left-8 duration-1000">
              {capabilities.map((cap, i) => (
                <div key={i} className="flex gap-5 group rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/30">
                  <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                    <cap.icon className="size-6" />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-lg font-bold text-foreground">{cap.title}</h3>
                    <p className="mt-1 text-base text-muted-foreground leading-relaxed">{cap.body}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-8 lg:pl-12 animate-in fade-in slide-in-from-right-8 duration-1000 fill-mode-both">
              <div className="flex flex-col gap-6">
                <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl lg:leading-[1.1]">
                  <span className="bg-gradient-to-r from-foreground via-foreground to-foreground bg-clip-text text-transparent">Welcome to </span>
                  <br />
                  <span className="bg-gradient-to-r from-primary via-[#d946ef] to-primary bg-clip-text text-transparent animate-pulse">
                    Ethara Teams
                  </span>
                </h1>
                <p className="text-lg leading-relaxed text-muted-foreground">
                  A secure, high-performance operations platform designed for serious teams. Stop losing context across tools and start executing in one place.
                </p>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <Link href="/register" className={buttonVariants({ size: "lg", className: "h-14 px-8 text-base shadow-[0_0_20px_rgba(255,0,255,0.25)] hover:shadow-[0_0_30px_rgba(255,0,255,0.4)] transition-all duration-300" })}>
                  Start your workspace
                  <ArrowRight className="ml-2 size-5" />
                </Link>
                <Link
                  href="/login"
                  className={buttonVariants({ size: "lg", variant: "outline", className: "h-14 px-8 text-base bg-background/50 backdrop-blur-sm" })}
                >
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>


    </main>
  );
}
