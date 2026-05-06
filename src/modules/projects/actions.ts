"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { createProject } from "@/modules/projects/services";
import { projectCreateSchema } from "@/modules/projects/validators";

export async function createProjectAction(formData: FormData) {
  const user = await requireUser();
  const input = projectCreateSchema.parse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });

  await createProject(user.id, input);
  revalidatePath("/dashboard");
}
