"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, UserPlus } from "lucide-react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { registerSchema } from "@/modules/auth";

type RegisterValues = {
  name: string;
  username: string;
  email: string;
  password: string;
};

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

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isGoogleLoading, setGoogleLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: searchParams.get("email") ?? "",
    },
  });

  async function onSubmit(values: RegisterValues) {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      toast.error(payload?.error ?? "Could not create account");
      return;
    }

    const payload = await response.json();

    if (payload.requiresEmailVerification) {
      toast.success("Account created. Verify your email to continue.");
      router.push("/login?verify=1");
      router.refresh();
      return;
    }

    const result = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
    });

    if (result?.error) {
      toast.error("Account created. Please sign in manually.");
      router.push("/login");
      router.refresh();
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    await signIn("google", {
      callbackUrl: "/dashboard",
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <Button
        type="button"
        size="lg"
        onClick={handleGoogle}
        disabled={isGoogleLoading || isSubmitting}
        variant="outline"
        className="w-full transition-colors"
      >
        {isGoogleLoading ? (
          <Loader2 className="mr-2 animate-spin size-4" />
        ) : (
          <GoogleMark />
        )}
        Sign up with Google
      </Button>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">or create with email</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <FieldGroup>
          <Field data-invalid={Boolean(errors.name)}>
            <FieldLabel htmlFor="name">Name</FieldLabel>
            <Input
              id="name"
              autoComplete="name"
              aria-invalid={Boolean(errors.name)}
              {...register("name")}
            />
            {errors.name ? (
              <FieldDescription>{errors.name.message}</FieldDescription>
            ) : null}
          </Field>
          <Field data-invalid={Boolean(errors.username)}>
            <FieldLabel htmlFor="username">Username</FieldLabel>
            <Input
              id="username"
              autoComplete="username"
              aria-invalid={Boolean(errors.username)}
              {...register("username")}
            />
            {errors.username ? (
              <FieldDescription>{errors.username.message}</FieldDescription>
            ) : null}
          </Field>
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
              autoComplete="new-password"
              aria-invalid={Boolean(errors.password)}
              {...register("password")}
            />
            {errors.password ? (
              <FieldDescription>{errors.password.message}</FieldDescription>
            ) : null}
          </Field>
        </FieldGroup>
        <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_15px_rgba(255,0,255,0.25)] transition-all mt-2" disabled={isSubmitting || isGoogleLoading}>
          {isSubmitting ? (
            <Loader2 className="mr-2 animate-spin size-4" />
          ) : (
            <UserPlus className="mr-2 size-4" />
          )}
          Create account
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-2">
        Already using Ethara?{" "}
        <Link href="/login" className="font-medium text-foreground hover:text-primary transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  );
}
