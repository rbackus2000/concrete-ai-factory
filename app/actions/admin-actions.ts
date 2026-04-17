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
import { createFinish, updateFinish } from "@/lib/services/finish-service";
import { createClient, updateClient } from "@/lib/services/client-service";
import { createSupplier, updateSupplier } from "@/lib/services/supplier-service";
import {
  createColorCollection,
  updateColorCollection,
  createProductColor,
  updateProductColor,
} from "@/lib/services/color-service";
import { syncMaterialPrice, syncAllMaterialPrices } from "@/lib/services/price-sync-service";
import { createLaborRate, updateLaborRate } from "@/lib/services/labor-rate-service";
import type { LaborRateAdminValues } from "@/lib/schemas/labor-rate";
import type { FinishAdminValues } from "@/lib/schemas/finish";
import type { ClientAdminValues } from "@/lib/schemas/client";
import type { SupplierAdminValues } from "@/lib/schemas/supplier";
import type { ColorCollectionAdminValues, ProductColorAdminValues } from "@/lib/schemas/color";

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

export async function createFinishAction(values: FinishAdminValues) {
  const actor = await requireAdminSession();
  const result = await createFinish(values, actor);
  revalidatePath("/admin");
  revalidatePath("/admin/finishes");
  return result;
}

export async function updateFinishAction(id: string, values: FinishAdminValues) {
  const actor = await requireAdminSession();
  const result = await updateFinish(id, values, actor);
  revalidatePath("/admin");
  revalidatePath("/admin/finishes");
  revalidatePath(`/admin/finishes/${id}`);
  return result;
}

export async function createClientAction(values: ClientAdminValues) {
  const actor = await requireAdminSession();
  const result = await createClient(values, actor);
  revalidatePath("/admin");
  revalidatePath("/admin/clients");
  return result;
}

export async function updateClientAction(id: string, values: ClientAdminValues) {
  const actor = await requireAdminSession();
  const result = await updateClient(id, values, actor);
  revalidatePath("/admin");
  revalidatePath("/admin/clients");
  revalidatePath(`/admin/clients/${id}`);
  return result;
}

// ── Supplier Actions ─────────────────────────────────────────

export async function createSupplierAction(values: SupplierAdminValues) {
  const actor = await requireAdminSession();
  const result = await createSupplier(values, actor);
  revalidatePath("/admin");
  revalidatePath("/admin/suppliers");
  return result;
}

export async function updateSupplierAction(id: string, values: SupplierAdminValues) {
  const actor = await requireAdminSession();
  const result = await updateSupplier(id, values, actor);
  revalidatePath("/admin");
  revalidatePath("/admin/suppliers");
  revalidatePath(`/admin/suppliers/${id}`);
  return result;
}

// ── Color Actions ────────────────────────────────────────────

export async function createColorCollectionAction(values: ColorCollectionAdminValues) {
  const actor = await requireAdminSession();
  const result = await createColorCollection(values, actor);
  revalidatePath("/admin");
  revalidatePath("/admin/colors");
  return result;
}

export async function updateColorCollectionAction(id: string, values: ColorCollectionAdminValues) {
  const actor = await requireAdminSession();
  const result = await updateColorCollection(id, values, actor);
  revalidatePath("/admin");
  revalidatePath("/admin/colors");
  return result;
}

export async function createProductColorAction(values: ProductColorAdminValues) {
  const actor = await requireAdminSession();
  const result = await createProductColor(values, actor);
  revalidatePath("/admin");
  revalidatePath("/admin/colors");
  return result;
}

export async function updateProductColorAction(id: string, values: ProductColorAdminValues) {
  const actor = await requireAdminSession();
  const result = await updateProductColor(id, values, actor);
  revalidatePath("/admin");
  revalidatePath("/admin/colors");
  revalidatePath(`/admin/colors/${id}`);
  return result;
}

// ── Price Sync Actions ───────────────────────────────────────

export async function syncSingleMaterialPriceAction(materialId: string) {
  const actor = await requireAdminSession();
  const result = await syncMaterialPrice(materialId, actor);
  revalidatePath("/admin/materials-master");
  revalidatePath(`/admin/materials-master/${materialId}`);
  return result;
}

export async function syncAllMaterialPricesAction() {
  const actor = await requireAdminSession();
  const results = await syncAllMaterialPrices(actor);
  revalidatePath("/admin/materials-master");
  return results;
}

// ── Labor Rate Actions ───────────────────────────────────────

export async function createLaborRateAction(values: LaborRateAdminValues) {
  const actor = await requireAdminSession();
  const result = await createLaborRate(values, actor);
  revalidatePath("/admin");
  revalidatePath("/admin/labor-rates");
  return result;
}

export async function updateLaborRateAction(id: string, values: LaborRateAdminValues) {
  const actor = await requireAdminSession();
  const result = await updateLaborRate(id, values, actor);
  revalidatePath("/admin");
  revalidatePath("/admin/labor-rates");
  revalidatePath(`/admin/labor-rates/${id}`);
  return result;
}
