import { NextResponse } from "next/server";
import { apiError, requireApiUser } from "@/lib/api";
import { getProjectAnalytics } from "@/modules/analytics";

type ProjectRouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

export async function GET(_request: Request, context: ProjectRouteContext) {
  try {
    const user = await requireApiUser();
    const { projectId } = await context.params;
    const analytics = await getProjectAnalytics(user.id, projectId);
    return NextResponse.json(analytics);
  } catch (error) {
    return apiError(error);
  }
}
