import type { CategoryScope, OutputType, RuleCategory, SkuCategory } from "../schemas/domain";
import type { Sku } from "../schemas/sku";

export type RuleRecord = {
  code: string;
  title: string;
  category: RuleCategory;
  categoryScope: CategoryScope;
  skuCategory?: SkuCategory | null;
  skuOverrideId?: string | null;
  outputType?: OutputType | null;
  status: string;
  priority: number;
  description: string;
  ruleText: string;
  source: string;
};

function matchesRuleScope(rule: RuleRecord, sku: Sku & { id?: string }) {
  if (rule.categoryScope === "GLOBAL") {
    return true;
  }

  if (rule.categoryScope === "SKU_CATEGORY") {
    return rule.skuCategory === sku.category;
  }

  return rule.skuOverrideId === sku.id;
}

export function resolveRulesForSku({
  sku,
  rules,
}: {
  sku: Sku & { id?: string };
  rules: RuleRecord[];
}) {
  return rules
    .filter((rule) => matchesRuleScope(rule, sku))
    .sort((left, right) => left.priority - right.priority || left.title.localeCompare(right.title));
}
