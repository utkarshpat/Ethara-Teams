import { NextResponse } from "next/server";
import { apiError, requireApiUser } from "@/lib/api";
import { createProject, listProjects, projectCreateSchema } from "@/modules/projects";

function serializeProject(project: Awaited<ReturnType<typeof listProjects>>[number]) {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    ownerId: project.ownerId,
    updatedAt: project.updatedAt.toISOString(),
    taskCount: project._count.tasks,
    members: project.members.map((member) => ({
      id: member.id,
      role: member.role,
      user: member.user,
    })),
  };
}

export async function GET() {
  try {
    const user = await requireApiUser();
    const projects = await listProjects(user.id);
    return NextResponse.json(projects.map(serializeProject));
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const input = projectCreateSchema.parse(await request.json());
    const project = await createProject(user.id, input);
    return NextResponse.json({ id: project.id }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
