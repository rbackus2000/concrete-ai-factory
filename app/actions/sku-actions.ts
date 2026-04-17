"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth/session";
import { updateSkuFromEditor } from "@/lib/services/sku-service";
import { createSku } from "@/lib/services/sku-write";
import { skuEditorSchema, type SkuEditorValues } from "@/lib/schemas/sku";

export async function createSkuAction(code: string, values: SkuEditorValues) {
  const actor = await requireSession();
  const parsed = skuEditorSchema.parse(values);

  let datumSystemJson: unknown = [];
  let calculatorDefaults: unknown = {};
  try { datumSystemJson = JSON.parse(parsed.datumSystemJson); } catch { /* keep default */ }
  try { calculatorDefaults = JSON.parse(parsed.calculatorDefaultsJson); } catch { /* keep default */ }

  const sku = await createSku({
    code,
    slug: parsed.slug,
    name: parsed.name,
    category: parsed.category,
    status: parsed.status,
    type: parsed.type,
    finish: parsed.finish,
    description: parsed.summary,
    targetWeightMinLbs: parsed.targetWeightMin,
    targetWeightMaxLbs: parsed.targetWeightMax,
    outerLength: parsed.outerLength,
    outerWidth: parsed.outerWidth,
    outerHeight: parsed.outerHeight,
    innerLength: parsed.innerLength,
    innerWidth: parsed.innerWidth,
    innerDepth: parsed.innerDepth,
    wallThickness: parsed.wallThickness,
    bottomThickness: parsed.bottomThickness,
    topLipThickness: parsed.topLipThickness,
    hollowCoreDepth: parsed.hollowCoreDepth,
    domeRiseMin: parsed.domeRiseMin,
    domeRiseMax: parsed.domeRiseMax,
    longRibCount: parsed.longRibCount,
    crossRibCount: parsed.crossRibCount,
    ribWidth: parsed.ribWidth,
    ribHeight: parsed.ribHeight,
    drainDiameter: parsed.drainDiameter,
    reinforcementDiameter: parsed.reinforcementDiameter,
    reinforcementThickness: parsed.reinforcementThickness,
    draftAngle: parsed.draftAngle,
    cornerRadius: parsed.cornerRadius,
    fiberPercent: parsed.fiberPercent,
    retailPrice: parsed.retailPrice || null,
    wholesalePrice: parsed.wholesalePrice || null,
    laborRate: parsed.laborRateId?.trim() ? { connect: { id: parsed.laborRateId } } : undefined,
    laborHoursPerUnit: parsed.laborHoursPerUnit || null,
    datumSystemJson: datumSystemJson as never,
    calculatorDefaults: calculatorDefaults as never,
  }, actor);

  revalidatePath("/skus");
  return { success: true, sku };
}

export async function updateSkuAction(skuCode: string, values: SkuEditorValues) {
  const actor = await requireSession();
  const parsed = skuEditorSchema.parse(values);
  const sku = await updateSkuFromEditor(skuCode, parsed, actor);

  revalidatePath("/skus");
  revalidatePath(`/skus/${skuCode}`);

  return {
    success: true,
    sku,
  };
}
