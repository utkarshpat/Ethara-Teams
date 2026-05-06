"use client";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground">
        <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-5 px-6 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            Something needs attention
          </p>
          <h1 className="text-3xl font-semibold tracking-normal">
            Ethara Teams could not render this view.
          </h1>
          <p className="text-sm text-muted-foreground">{error.message}</p>
          <Button onClick={reset}>Try again</Button>
        </main>
      </body>
    </html>
  );
}
