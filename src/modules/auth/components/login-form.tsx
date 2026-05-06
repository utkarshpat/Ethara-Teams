"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, Loader2, LogIn, ShieldCheck, UserRound } from "lucide-react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type LoginValues = z.infer<typeof loginSchema>;

const demoAccounts = [
  {
    name: "Aarav Manager",
    role: "Manager",
    email: "manager1@ethara.dev",
    password: "Password@123",
  },
  {
    name: "Nisha Manager",
    role: "Manager",
    email: "manager2@ethara.dev",
    password: "Password@123",
  },
  {
    name: "Mira Member",
    role: "Member",
    email: "member1@ethara.dev",
    password: "Password@123",
  },
  {
    name: "Kabir Member",
    role: "Member",
    email: "member2@ethara.dev",
    password: "Password@123",
  },
  {
    name: "Ira Member",
    role: "Member",
    email: "member3@ethara.dev",
    password: "Password@123",
  },
  {
    name: "Dev Member",
    role: "Member",
    email: "member4@ethara.dev",
    password: "Password@123",
  },
  {
    name: "Riya Member",
    role: "Member",
    email: "member5@ethara.dev",
    password: "Password@123",
  },
  {
    name: "Omar Member",
    role: "Member",
    email: "member6@ethara.dev",
    password: "Password@123",
  },
  {
    name: "Tara Member",
    role: "Member",
    email: "member7@ethara.dev",
    password: "Password@123",
  },
  {
    name: "Neel Member",
    role: "Member",
    email: "member8@ethara.dev",
    password: "Password@123",
  },
] as const;

function GoogleMark() {
  return (
    <svg className="size-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isGoogleLoading, setGoogleLoading] = useState(false);
  const [demoLoadingEmail, setDemoLoadingEmail] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    const verified = searchParams.get("verified");
    const verify = searchParams.get("verify");

    if (verified === "1") {
      toast.success("Email verified. You can sign in now.");
    }

    if (verified === "invalid") {
      toast.error("Verification link is invalid or expired.");
    }

    if (verify === "1") {
      toast.info("Check your email to verify the account before signing in.");
    }
  }, [searchParams]);

  async function onSubmit(values: LoginValues) {
    const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
    const result = await signIn("credentials", {
      ...values,
      redirect: false,
      callbackUrl,
    });

    if (result?.error) {
      if (result.error === "EMAIL_NOT_VERIFIED") {
        toast.error("Please verify your email before signing in.");
        return;
      }

      toast.error("Invalid email or password");
      return;
    }

    const destination = new URL(result?.url ?? callbackUrl, window.location.origin);
    router.push(`${destination.pathname}${destination.search}`);
    router.refresh();
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    await signIn("google", {
      callbackUrl: "/dashboard",
    });
  }

  async function handleDemoLogin(email: string, password: string) {
    setDemoLoadingEmail(email);
    const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    if (result?.error) {
      setDemoLoadingEmail(null);
      toast.error("Demo account is not ready. Run the database seed once.");
      return;
    }

    const destination = new URL(result?.url ?? callbackUrl, window.location.origin);
    router.push(`${destination.pathname}${destination.search}`);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <Dialog>
        <DialogTrigger render={<Button type="button" size="lg" />}>
          <KeyRound data-icon="inline-start" />
          Demo login
        </DialogTrigger>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Choose a demo workspace identity</DialogTitle>
            <DialogDescription>
              Managers can create projects, invite admins, and assign work. Members can execute assigned tasks and collaborate.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            {demoAccounts.map((account) => {
              const isManager = account.role === "Manager";
              const isLoading = demoLoadingEmail === account.email;

              return (
                <Button
                  key={account.email}
                  type="button"
                  variant="outline"
                  className="h-auto justify-start p-4 text-left"
                  disabled={Boolean(demoLoadingEmail) || isGoogleLoading || isSubmitting}
                  onClick={() => handleDemoLogin(account.email, account.password)}
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    {isLoading ? (
                      <Loader2 className="animate-spin" />
                    ) : isManager ? (
                      <ShieldCheck />
                    ) : (
                      <UserRound />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-foreground">
                      {account.name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {account.role} · {account.email}
                    </span>
                  </span>
                </Button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <Button
        type="button"
        size="lg"
        onClick={handleGoogle}
        disabled={isGoogleLoading || isSubmitting || Boolean(demoLoadingEmail)}
        variant="outline"
        className="w-full transition-colors"
      >
        {isGoogleLoading ? (
          <Loader2 className="mr-2 animate-spin size-4" />
        ) : (
          <GoogleMark />
        )}
        Continue with Google
      </Button>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">or sign in with email</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <FieldGroup>
          <Field data-invalid={Boolean(errors.email)}>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
              {...register("email")}
            />
            {errors.email ? (
              <FieldDescription>{errors.email.message}</FieldDescription>
            ) : null}
          </Field>
          <Field data-invalid={Boolean(errors.password)}>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              aria-invalid={Boolean(errors.password)}
              {...register("password")}
            />
            {errors.password ? (
              <FieldDescription>{errors.password.message}</FieldDescription>
            ) : null}
          </Field>
        </FieldGroup>
        <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_15px_rgba(255,0,255,0.25)] transition-all mt-2" disabled={isSubmitting || isGoogleLoading || Boolean(demoLoadingEmail)}>
          {isSubmitting ? (
            <Loader2 className="mr-2 animate-spin size-4" />
          ) : (
            <LogIn className="mr-2 size-4" />
          )}
          Sign in
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-2">
        New to Ethara?{" "}
        <Link href="/register" className="font-medium text-foreground hover:text-primary transition-colors">
          Create an account
        </Link>
      </p>
    </div>
  );
}
