import { NextResponse } from "next/server";
import { apiError, requireApiUser } from "@/lib/api";
import { addMemberSchema, addProjectMember } from "@/modules/projects";
import { listProjectUsers } from "@/modules/users";

type ProjectRouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

export async function GET(_request: Request, context: ProjectRouteContext) {
  try {
    const user = await requireApiUser();
    const { projectId } = await context.params;
    const members = await listProjectUsers(user.id, projectId);
    return NextResponse.json(members);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request, context: ProjectRouteContext) {
  try {
    const user = await requireApiUser();
    const { projectId } = await context.params;
    const input = addMemberSchema.parse(await request.json());
    const result = await addProjectMember(user.id, projectId, input);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
