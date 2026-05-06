import { NextResponse } from "next/server";
import { apiError, requireApiUser } from "@/lib/api";
import { softDeleteProject } from "@/modules/projects";

type ProjectRouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

export async function DELETE(_request: Request, context: ProjectRouteContext) {
  try {
    const user = await requireApiUser();
    const { projectId } = await context.params;
    await softDeleteProject(user.id, projectId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
