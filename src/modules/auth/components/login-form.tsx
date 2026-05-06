"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, LogIn, ShieldCheck, UserRoundCheck } from "lucide-react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
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

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isGoogleLoading, setGoogleLoading] = useState(false);
  const [isDemoLoading, setDemoLoading] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });
  const isAuthLoading = isSubmitting || isDemoLoading;

  async function onSubmit(values: LoginValues) {
    const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
    const result = await signIn("credentials", {
      ...values,
      redirect: false,
      callbackUrl,
    });

    if (result?.error) {
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

  async function handleDemoLogin(values: LoginValues) {
    setDemoLoading(true);
    setValue("email", values.email, { shouldValidate: true });
    setValue("password", values.password, { shouldValidate: true });
    try {
      await onSubmit(values);
    } finally {
      setDemoLoading(false);
    }
  }

  return (
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
      <Button type="submit" disabled={isAuthLoading}>
        {isAuthLoading ? (
          <Loader2 data-icon="inline-start" className="animate-spin" />
        ) : (
          <LogIn data-icon="inline-start" />
        )}
        Sign in
      </Button>
      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          type="button"
          variant="outline"
          disabled={isAuthLoading}
          onClick={() =>
            handleDemoLogin({
              email: "admin@ethara.dev",
              password: "Password@123",
            })
          }
        >
          <ShieldCheck data-icon="inline-start" />
          Admin demo
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isAuthLoading}
          onClick={() =>
            handleDemoLogin({
              email: "member@ethara.dev",
              password: "Password@123",
            })
          }
        >
          <UserRoundCheck data-icon="inline-start" />
          Member demo
        </Button>
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={handleGoogle}
        disabled={isGoogleLoading || isAuthLoading}
      >
        {isGoogleLoading ? (
          <Loader2 data-icon="inline-start" className="animate-spin" />
        ) : null}
        Continue with Google
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link href="/register" className="font-medium text-foreground">
          Create an account
        </Link>
      </p>
    </form>
  );
}
