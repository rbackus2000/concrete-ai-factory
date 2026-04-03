"use server";

import { revalidatePath } from "next/cache";

import { requireAdminSession } from "@/lib/auth/session";
import {
  createBuildPacketTemplate,
  createMaterialsMaster,
  createPromptTemplate,
  createQcTemplate,
  createRulesMaster,
  updateBuildPacketTemplate,
  updateMaterialsMaster,
  updatePromptTemplate,
  updateQcTemplate,
  updateRulesMaster,
} from "@/lib/services/admin-service";
import type {
  BuildPacketTemplateAdminValues,
  MaterialsMasterAdminValues,
  PromptTemplateAdminValues,
  QcTemplateAdminValues,
  RulesMasterAdminValues,
} from "@/lib/schemas/admin";

export async function createPromptTemplateAction(values: PromptTemplateAdminValues) {
  const actor = await requireAdminSession();
  const result = await createPromptTemplate(values, actor);

  revalidatePath("/admin");
  revalidatePath("/admin/prompt-templates");

  return result;
}

export async function updatePromptTemplateAction(id: string, values: PromptTemplateAdminValues) {
  const actor = await requireAdminSession();
  const result = await updatePromptTemplate(id, values, actor);

  revalidatePath("/admin");
  revalidatePath("/admin/prompt-templates");
  revalidatePath(`/admin/prompt-templates/${id}`);

  return result;
}

export async function createRulesMasterAction(values: RulesMasterAdminValues) {
  const actor = await requireAdminSession();
  const result = await createRulesMaster(values, actor);

  revalidatePath("/admin");
  revalidatePath("/admin/rules-master");

  return result;
}

export async function updateRulesMasterAction(id: string, values: RulesMasterAdminValues) {
  const actor = await requireAdminSession();
  const result = await updateRulesMaster(id, values, actor);

  revalidatePath("/admin");
  revalidatePath("/admin/rules-master");
  revalidatePath(`/admin/rules-master/${id}`);

  return result;
}

export async function createBuildPacketTemplateAction(values: BuildPacketTemplateAdminValues) {
  const actor = await requireAdminSession();
  const result = await createBuildPacketTemplate(values, actor);

  revalidatePath("/admin");
  revalidatePath("/admin/build-packet-templates");

  return result;
}

export async function updateBuildPacketTemplateAction(
  id: string,
  values: BuildPacketTemplateAdminValues,
) {
  const actor = await requireAdminSession();
  const result = await updateBuildPacketTemplate(id, values, actor);

  revalidatePath("/admin");
  revalidatePath("/admin/build-packet-templates");
  revalidatePath(`/admin/build-packet-templates/${id}`);

  return result;
}

export async function createQcTemplateAction(values: QcTemplateAdminValues) {
  const actor = await requireAdminSession();
  const result = await createQcTemplate(values, actor);

  revalidatePath("/admin");
  revalidatePath("/admin/qc-templates");

  return result;
}

export async function updateQcTemplateAction(id: string, values: QcTemplateAdminValues) {
  const actor = await requireAdminSession();
  const result = await updateQcTemplate(id, values, actor);

  revalidatePath("/admin");
  revalidatePath("/admin/qc-templates");
  revalidatePath(`/admin/qc-templates/${id}`);

  return result;
}

export async function createMaterialsMasterAction(values: MaterialsMasterAdminValues) {
  const actor = await requireAdminSession();
  const result = await createMaterialsMaster(values, actor);

  revalidatePath("/admin");
  revalidatePath("/admin/materials-master");

  return result;
}

export async function updateMaterialsMasterAction(id: string, values: MaterialsMasterAdminValues) {
  const actor = await requireAdminSession();
  const result = await updateMaterialsMaster(id, values, actor);

  revalidatePath("/admin");
  revalidatePath("/admin/materials-master");
  revalidatePath(`/admin/materials-master/${id}`);

  return result;
}
