"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth/session";
import { slatWallProjectEditorSchema, type SlatWallProjectEditorValues } from "@/lib/schemas/slat-wall";
import { createSlatWallProject, updateSlatWallProject } from "@/lib/services/slat-wall-write";

export async function createSlatWallAction(values: SlatWallProjectEditorValues) {
  await requireSession();
  const parsed = slatWallProjectEditorSchema.parse(values);
  const project = await createSlatWallProject(parsed);

  revalidatePath("/slat-walls");

  return { id: project.id, code: project.code };
}

export async function updateSlatWallAction(
  projectId: string,
  values: SlatWallProjectEditorValues,
) {
  await requireSession();
  const parsed = slatWallProjectEditorSchema.parse(values);
  const project = await updateSlatWallProject(projectId, parsed);

  revalidatePath("/slat-walls");
  revalidatePath(`/slat-walls/${projectId}`);

  return { id: project.id, code: project.code };
}
