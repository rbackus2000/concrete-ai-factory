import { prisma } from "../db";
import { buildPacketForSku } from "../engines/packet-builder";
import { resolveRulesForSku } from "../engines/rules-engine";
import { buildValidationSummary } from "../engines/validation-engine";
import {
  buildScopedWhere,
  mapSkuRecord,
  parseStringArray,
} from "./service-helpers";

export async function getPacketPreview(skuCode: string) {
  const sku = await prisma.sku.findUnique({
    where: { code: skuCode },
  });

  if (!sku) {
    return null;
  }

  const scopeWhere = buildScopedWhere(sku);

  const [rules, qcTemplates, packetTemplates] = await Promise.all([
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
    prisma.buildPacketTemplate.findMany({
      where: {
        status: "ACTIVE",
        ...scopeWhere,
      },
      orderBy: [{ sectionOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  const mappedSku = {
    id: sku.id,
    ...mapSkuRecord(sku),
  };
  const mappedRules = resolveRulesForSku({
    sku: mappedSku,
    rules: rules.map((rule) => ({
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
    })),
  });
  const validation = buildValidationSummary({
    sku: mappedSku,
    qcTemplates: qcTemplates.map((template) => ({
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
    })),
    rules: mappedRules,
  });

  const packet = buildPacketForSku({
    sku: mappedSku,
    templates: packetTemplates.map((template) => ({
      packetKey: template.packetKey,
      sectionKey: template.sectionKey,
      name: template.name,
      sectionOrder: template.sectionOrder,
      categoryScope: template.categoryScope,
      skuCategory: template.skuCategory,
      skuOverrideId: template.skuOverrideId,
      outputType: template.outputType,
      status: template.status,
      content: template.content,
    })),
    rules: mappedRules,
    qcTemplates: validation.templates,
  });

  return {
    sku: mappedSku,
    ...packet,
    rejectionCriteria: validation.rejectionCriteria,
    criticalRules: validation.criticalRules,
  };
}
