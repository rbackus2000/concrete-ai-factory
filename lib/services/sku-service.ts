import { AuditAction, AuditEntityType, type Prisma } from "@prisma/client";

import type { ActionActor } from "@/lib/auth/session";

import { createAuditLog, buildChangedFields, summarizeAuditChange } from "./audit-service";
import { prisma } from "../db";
import { buildCalculatorSnapshot, type MaterialRecord } from "../engines/calculator-engine";
import { resolveRulesForSku, type RuleRecord } from "../engines/rules-engine";
import { buildValidationSummary, type QcTemplateRecord } from "../engines/validation-engine";
import {
  parseCalculatorDefaultsJsonInput,
  parseDatumSystemJsonInput,
  skuEditorSchema,
  type SkuEditorValues,
} from "../schemas/sku";
import { buildScopedWhere, decimalToNumber, mapSkuRecord, mapSkuRecordWithPricing, parseStringArray } from "./service-helpers";
import { createSku, updateSku } from "./sku-write";

function mapMaterialRecord(material: {
  code: string;
  name: string;
  category: MaterialRecord["category"];
  categoryScope: MaterialRecord["categoryScope"];
  skuCategory: MaterialRecord["skuCategory"];
  skuOverrideId: string | null;
  status: string;
  unit: string;
  quantity: Prisma.Decimal | null;
  unitCost: Prisma.Decimal | null;
  notes: string | null;
}): MaterialRecord {
  return {
    code: material.code,
    name: material.name,
    category: material.category,
    categoryScope: material.categoryScope,
    skuCategory: material.skuCategory,
    skuOverrideId: material.skuOverrideId,
    status: material.status,
    unit: material.unit,
    quantity: decimalToNumber(material.quantity) ?? 0,
    unitCost: decimalToNumber(material.unitCost) ?? 0,
    notes: material.notes ?? "",
  };
}

function mapRuleRecord(rule: {
  code: string;
  title: string;
  category: RuleRecord["category"];
  categoryScope: RuleRecord["categoryScope"];
  skuCategory: RuleRecord["skuCategory"];
  skuOverrideId: string | null;
  outputType: RuleRecord["outputType"];
  status: string;
  priority: number;
  description: string | null;
  ruleText: string;
  source: string | null;
}): RuleRecord {
  return {
    code: rule.code,
    title: rule.title,
    category: rule.category,
    categoryScope: rule.categoryScope,
    skuCategory: rule.skuCategory,
    skuOverrideId: rule.skuOverrideId,
    outputType: rule.outputType,
    status: rule.status,
    priority: rule.priority,
    description: rule.description ?? "",
    ruleText: rule.ruleText,
    source: rule.source ?? "",
  };
}

function mapQcTemplateRecord(template: {
  templateKey: string;
  name: string;
  category: QcTemplateRecord["category"];
  categoryScope: QcTemplateRecord["categoryScope"];
  skuCategory: QcTemplateRecord["skuCategory"];
  skuOverrideId: string | null;
  status: string;
  checklistJson: Prisma.JsonValue;
  acceptanceCriteriaJson: Prisma.JsonValue | null;
  rejectionCriteriaJson: Prisma.JsonValue | null;
}): QcTemplateRecord {
  return {
    templateKey: template.templateKey,
    name: template.name,
    category: template.category,
    categoryScope: template.categoryScope,
    skuCategory: template.skuCategory,
    skuOverrideId: template.skuOverrideId,
    status: template.status,
    checklist: parseStringArray(template.checklistJson),
    acceptanceCriteria: parseStringArray(template.acceptanceCriteriaJson),
    rejectionCriteria: parseStringArray(template.rejectionCriteriaJson),
  };
}

export { createSku, updateSku };

export async function getSkus() {
  const skus = await prisma.sku.findMany({
    orderBy: {
      code: "asc",
    },
  });

  return skus.map(mapSkuRecord);
}

export async function getSkuByCode(code: string) {
  const sku = await prisma.sku.findUnique({
    where: { code },
  });

  if (!sku) {
    return null;
  }

  return {
    id: sku.id,
    ...mapSkuRecord(sku),
  };
}

export async function getSkuDetail(code: string) {
  const sku = await prisma.sku.findUnique({
    where: { code },
  });

  if (!sku) {
    return null;
  }

  const scopeWhere = buildScopedWhere(sku);

  const [materialRows, ruleRows, qcRows, recentOutputRows] = await Promise.all([
    prisma.materialsMaster.findMany({
      where: {
        status: "ACTIVE",
        ...scopeWhere,
      },
      orderBy: {
        code: "asc",
      },
    }),
    prisma.rulesMaster.findMany({
      where: {
        status: "ACTIVE",
        ...scopeWhere,
      },
      orderBy: [{ priority: "asc" }, { title: "asc" }],
    }),
    prisma.qcTemplate.findMany({
      where: {
        status: "ACTIVE",
        ...scopeWhere,
      },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    }),
    prisma.generatedOutput.findMany({
      where: {
        skuId: sku.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    }),
  ]);

  const mappedSku = {
    id: sku.id,
    ...mapSkuRecordWithPricing(sku),
  };
  const materials = materialRows.map(mapMaterialRecord);
  const rules = resolveRulesForSku({
    sku: mappedSku,
    rules: ruleRows.map(mapRuleRecord),
  });
  const validation = buildValidationSummary({
    sku: mappedSku,
    qcTemplates: qcRows.map(mapQcTemplateRecord),
    rules,
  });

  return {
    sku: mappedSku,
    materials,
    rules,
    qcTemplates: validation.templates,
    rejectionCriteria: validation.rejectionCriteria,
    criticalRules: validation.criticalRules,
    recentOutputs: recentOutputRows.map((output) => ({
      id: output.id,
      title: output.title,
      outputType: output.outputType,
      status: output.status,
      version: output.version,
      createdAt: output.createdAt.toISOString(),
    })),
    calculator: buildCalculatorSnapshot({
      sku: mappedSku,
      materials,
      defaults: mappedSku.calculatorDefaults,
    }),
  };
}

export async function updateSkuFromEditor(
  code: string,
  values: SkuEditorValues,
  actor: ActionActor,
) {
  const parsed = skuEditorSchema.parse(values);
  const existing = await prisma.sku.findUnique({
    where: { code },
  });

  if (!existing) {
    throw new Error(`SKU ${code} was not found.`);
  }

  const updated = await updateSku(code, {
    name: parsed.name,
    slug: parsed.slug,
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
    drainType: parsed.drainType,
    basinSlopeDeg: parsed.basinSlopeDeg,
    slopeDirection: parsed.slopeDirection,
    mountType: parsed.mountType,
    hasOverflow: parsed.hasOverflow,
    overflowHoleDiameter: parsed.overflowHoleDiameter,
    overflowPosition: parsed.overflowPosition,
    reinforcementDiameter: parsed.reinforcementDiameter,
    reinforcementThickness: parsed.reinforcementThickness,
    draftAngle: parsed.draftAngle,
    cornerRadius: parsed.cornerRadius,
    fiberPercent: parsed.fiberPercent,
    retailPrice: parsed.retailPrice || null,
    wholesalePrice: parsed.wholesalePrice || null,
    datumSystemJson: parseDatumSystemJsonInput(parsed.datumSystemJson),
    calculatorDefaults: parseCalculatorDefaultsJsonInput(parsed.calculatorDefaultsJson),
  });

  const changedFields = buildChangedFields(
    {
      name: existing.name,
      slug: existing.slug,
      category: existing.category,
      status: existing.status,
      type: existing.type,
      finish: existing.finish,
      description: existing.description,
      targetWeightMinLbs: decimalToNumber(existing.targetWeightMinLbs),
      targetWeightMaxLbs: decimalToNumber(existing.targetWeightMaxLbs),
      outerLength: decimalToNumber(existing.outerLength),
      outerWidth: decimalToNumber(existing.outerWidth),
      outerHeight: decimalToNumber(existing.outerHeight),
      innerLength: decimalToNumber(existing.innerLength),
      innerWidth: decimalToNumber(existing.innerWidth),
      innerDepth: decimalToNumber(existing.innerDepth),
      wallThickness: decimalToNumber(existing.wallThickness),
      bottomThickness: decimalToNumber(existing.bottomThickness),
      topLipThickness: decimalToNumber(existing.topLipThickness),
      hollowCoreDepth: decimalToNumber(existing.hollowCoreDepth),
      domeRiseMin: decimalToNumber(existing.domeRiseMin),
      domeRiseMax: decimalToNumber(existing.domeRiseMax),
      longRibCount: existing.longRibCount,
      crossRibCount: existing.crossRibCount,
      ribWidth: decimalToNumber(existing.ribWidth),
      ribHeight: decimalToNumber(existing.ribHeight),
      drainDiameter: decimalToNumber(existing.drainDiameter),
      reinforcementDiameter: decimalToNumber(existing.reinforcementDiameter),
      reinforcementThickness: decimalToNumber(existing.reinforcementThickness),
      draftAngle: decimalToNumber(existing.draftAngle),
      cornerRadius: decimalToNumber(existing.cornerRadius),
      fiberPercent: decimalToNumber(existing.fiberPercent),
      retailPrice: decimalToNumber(existing.retailPrice),
      wholesalePrice: decimalToNumber(existing.wholesalePrice),
      datumSystemJson: existing.datumSystemJson,
      calculatorDefaults: existing.calculatorDefaults,
    },
    {
      name: parsed.name,
      slug: parsed.slug,
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
      datumSystemJson: parseDatumSystemJsonInput(parsed.datumSystemJson),
      calculatorDefaults: parseCalculatorDefaultsJsonInput(parsed.calculatorDefaultsJson),
    },
  );
  const action = parsed.status === "ARCHIVED" && existing.status !== "ARCHIVED" ? AuditAction.ARCHIVE : AuditAction.UPDATE;

  await createAuditLog({
    actor,
    entityType: AuditEntityType.SKU,
    entityId: existing.id,
    action,
    summary: summarizeAuditChange(`${existing.code} SKU`, action, changedFields),
    changedFields: changedFields as Prisma.InputJsonValue,
  });

  return updated;
}
