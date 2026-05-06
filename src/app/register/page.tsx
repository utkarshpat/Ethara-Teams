import type { Metadata } from "next";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { RegisterForm } from "@/modules/auth/components/register-form";

export const metadata: Metadata = {
  title: "Register",
};

export default function RegisterPage() {
  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <section className="glass-panel cyber-grid mx-auto grid min-h-[calc(100vh-2.5rem)] w-full max-w-6xl overflow-hidden rounded-lg lg:grid-cols-[0.95fr_1.05fr]">
        <div className="flex flex-col justify-center bg-[#030712]/40 p-6 sm:p-10">
          <div className="mx-auto flex max-w-md flex-col gap-7">
            <div className="flex flex-col gap-2">
              <Link href="/" className="flex items-center gap-3 text-base font-semibold tracking-normal">
                <span className="grid size-9 place-items-center rounded-md bg-primary text-sm text-primary-foreground shadow-[0_0_20px_rgba(255,0,255,0.35)]">
                  ET
                </span>
                Ethara Teams
              </Link>
              <h1 className="pt-5 text-3xl font-bold text-foreground">
                Create your workspace identity
              </h1>
              <p className="text-sm leading-6 text-muted-foreground">
                The first registered account becomes an admin automatically.
              </p>
            </div>
            <RegisterForm />
          </div>
        </div>
        <div className="relative hidden border-l border-white/10 bg-[#030712]/70 p-8 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-primary via-[#7e22ce] to-transparent" />
          <div className="flex flex-col gap-5">
            <ShieldCheck className="text-primary" />
            <h2 className="max-w-md text-4xl font-bold leading-tight">
              A modular monolith built for fast delivery.
            </h2>
            <p className="max-w-md text-sm leading-6 text-muted-foreground">
              Secure project boundaries, soft deletes, realtime comments, and
              installable PWA behavior are included from day one.
            </p>
          </div>
          <div className="grid gap-3">
            {["Project membership guard", "Soft-delete recovery", "Realtime task mentions"].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-md border border-white/10 bg-[#11182766] p-3 text-sm backdrop-blur-xl">
                <CheckCircle2 className="text-primary" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
