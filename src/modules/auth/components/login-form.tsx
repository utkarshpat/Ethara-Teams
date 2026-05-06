"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, LogIn } from "lucide-react";
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

function GoogleMark() {
  return (
    <span className="grid size-5 place-items-center rounded-full bg-white text-xs font-bold text-[#1f2937]">
      G
    </span>
  );
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isGoogleLoading, setGoogleLoading] = useState(false);
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
        Continue with Google
      </Button>
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-xs text-muted-foreground">or sign in with email</span>
        <div className="h-px flex-1 bg-white/10" />
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
        <Button type="submit" variant="outline" disabled={isSubmitting || isGoogleLoading}>
          {isSubmitting ? (
            <Loader2 data-icon="inline-start" className="animate-spin" />
          ) : (
            <LogIn data-icon="inline-start" />
          )}
          Sign in with email
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        New to Ethara?{" "}
        <Link href="/register" className="font-medium text-foreground">
          Create an account
        </Link>
      </p>
    </div>
  );
}
