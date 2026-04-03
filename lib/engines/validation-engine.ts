import type { CategoryScope, QcCategory, SkuCategory } from "../schemas/domain";
import type { Sku } from "../schemas/sku";
import type { RuleRecord } from "./rules-engine";

export type QcTemplateRecord = {
  templateKey: string;
  name: string;
  category: QcCategory;
  categoryScope: CategoryScope;
  skuCategory?: SkuCategory | null;
  skuOverrideId?: string | null;
  status: string;
  checklist: string[];
  acceptanceCriteria: string[];
  rejectionCriteria: string[];
};

function matchesValidationScope(template: QcTemplateRecord, sku: Sku & { id?: string }) {
  if (template.categoryScope === "GLOBAL") {
    return true;
  }

  if (template.categoryScope === "SKU_CATEGORY") {
    return template.skuCategory === sku.category;
  }

  return template.skuOverrideId === sku.id;
}

export function resolveQcTemplatesForSku({
  sku,
  qcTemplates,
}: {
  sku: Sku & { id?: string };
  qcTemplates: QcTemplateRecord[];
}) {
  return qcTemplates.filter((template) => matchesValidationScope(template, sku));
}

export function buildValidationSummary({
  sku,
  qcTemplates,
  rules,
}: {
  sku: Sku & { id?: string };
  qcTemplates: QcTemplateRecord[];
  rules: RuleRecord[];
}) {
  const templates = resolveQcTemplatesForSku({ sku, qcTemplates });
  const rejectionCriteria = templates.flatMap((template) => template.rejectionCriteria);
  const criticalRules = rules.filter((rule) => rule.priority === 1);

  return {
    templates,
    rejectionCriteria,
    criticalRules,
  };
}
