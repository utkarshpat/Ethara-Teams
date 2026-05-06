import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-5 px-6 text-center">
      <p className="text-sm font-medium text-muted-foreground">404</p>
      <h1 className="text-3xl font-semibold tracking-normal">Page not found</h1>
      <p className="text-sm text-muted-foreground">
        The workspace surface you requested is not available.
      </p>
      <Link href="/dashboard" className={buttonVariants()}>
        Back to dashboard
      </Link>
    </main>
  );
}
