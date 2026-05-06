import type { Metadata } from "next";
import { DashboardPageContent } from "@/app/dashboard/page-content";

export const metadata: Metadata = {
  title: "Dashboard",
};

type DashboardPageProps = {
  searchParams: Promise<{
    projectId?: string;
  }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  return <DashboardPageContent projectId={params.projectId} view="overview" />;
}
