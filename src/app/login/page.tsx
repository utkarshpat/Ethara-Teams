import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { LoginForm } from "@/modules/auth/components/login-form";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <main className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background">
      {/* Modern ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] opacity-50 pointer-events-none" />
      
      <section className="glass-panel w-full max-w-[400px] rounded-2xl p-8 relative z-10">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col items-center justify-center text-center">
            <Link href="/" className="group mb-6 inline-flex">
              <span className="grid size-12 place-items-center rounded-xl bg-primary/10 text-lg font-bold text-primary border border-primary/20 transition-transform group-hover:scale-105">
                ET
              </span>
            </Link>
            <h2 className="text-2xl font-bold text-foreground tracking-tight">
              Welcome back
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Sign in to your Ethara workspace
            </p>
          </div>
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </section>
      
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>
    </main>
  );
}
