"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, UserPlus } from "lucide-react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
    <span className="grid size-5 place-items-center rounded-full bg-white text-xs font-bold text-[#1f2937]">
      G
    </span>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const [isGoogleLoading, setGoogleLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
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

    await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
    });
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
        className="w-full"
      >
        {isGoogleLoading ? (
          <Loader2 data-icon="inline-start" className="animate-spin" />
        ) : (
          <GoogleMark />
        )}
        Sign up with Google
      </Button>
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-xs text-muted-foreground">or create with email</span>
        <div className="h-px flex-1 bg-white/10" />
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
        <Button type="submit" variant="outline" disabled={isSubmitting || isGoogleLoading}>
          {isSubmitting ? (
            <Loader2 data-icon="inline-start" className="animate-spin" />
          ) : (
            <UserPlus data-icon="inline-start" />
          )}
          Create account with email
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        Already using Ethara?{" "}
        <Link href="/login" className="font-medium text-foreground">
          Sign in
        </Link>
      </p>
    </div>
  );
}
