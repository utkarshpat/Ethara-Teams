import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DashboardPageContent } from "@/app/dashboard/page-content";
import type { DashboardView } from "@/modules/dashboard/types";

export const metadata: Metadata = {
  title: "Dashboard",
};

const allowedViews = [
  "tasks",
  "calendar",
  "chat",
  "reports",
  "team",
  "settings",
] as const;

type DashboardViewPageProps = {
  params: Promise<{
    view: string;
  }>;
  searchParams: Promise<{
    projectId?: string;
  }>;
};

function normalizeView(value: string): DashboardView {
  if (value === "tasks") {
    return "board";
  }

  return value as DashboardView;
}

export default async function DashboardViewPage({
  params,
  searchParams,
}: DashboardViewPageProps) {
  const [{ view }, query] = await Promise.all([params, searchParams]);

  if (!allowedViews.includes(view as (typeof allowedViews)[number])) {
    notFound();
  }

  return <DashboardPageContent projectId={query.projectId} view={normalizeView(view)} />;
}
