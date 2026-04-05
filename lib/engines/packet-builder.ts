import type { Sku } from "../schemas/sku";
import type { CategoryScope, OutputType, SkuCategory } from "../schemas/domain";
import type { RuleRecord } from "./rules-engine";
import type { QcTemplateRecord } from "./validation-engine";

export type BuildPacketTemplateRecord = {
  packetKey: string;
  sectionKey: string;
  name: string;
  sectionOrder: number;
  categoryScope: CategoryScope;
  skuCategory?: SkuCategory | null;
  skuOverrideId?: string | null;
  outputType: OutputType;
  status: string;
  content: string;
};

function matchesPacketScope(section: BuildPacketTemplateRecord, sku: Sku & { id?: string }) {
  if (section.categoryScope === "GLOBAL") {
    return true;
  }

  if (section.categoryScope === "SKU_CATEGORY") {
    return section.skuCategory === sku.category;
  }

  return section.skuOverrideId === sku.id;
}

function fmt(n: number) {
  return Number.isInteger(n) ? `${n}` : `${n}`.replace(/\.0+$/, "");
}

function fillPacketTokens(template: string, sku: Sku) {
  const tokens: Record<string, string> = {
    skuCode: sku.code,
    productName: sku.name,
    finish: sku.finish,
    type: sku.type,
    targetWeight: `${fmt(sku.targetWeight.min)} to ${fmt(sku.targetWeight.max)}`,
    outerDimensions: `${fmt(sku.outerLength)} x ${fmt(sku.outerWidth)} x ${fmt(sku.outerHeight)} inches`,
    innerDimensions: `${fmt(sku.innerLength)} x ${fmt(sku.innerWidth)} inches at ${fmt(sku.innerDepth)} inches deep`,
    outerLength: fmt(sku.outerLength),
    outerWidth: fmt(sku.outerWidth),
    outerHeight: fmt(sku.outerHeight),
    innerLength: fmt(sku.innerLength),
    innerWidth: fmt(sku.innerWidth),
    innerDepth: fmt(sku.innerDepth),
    wallThickness: fmt(sku.wallThickness),
    bottomThickness: fmt(sku.bottomThickness),
    topLipThickness: fmt(sku.topLipThickness),
    hollowCoreDepth: fmt(sku.hollowCoreDepth),
    draftAngle: fmt(sku.draftAngle),
    cornerRadius: fmt(sku.cornerRadius),
    drainDiameter: fmt(sku.drainDiameter),
    drainType: sku.drainType || "Round",
    basinSlopeDeg: fmt(sku.basinSlopeDeg),
    slopeDirection: sku.slopeDirection || "Center",
    mountType: sku.mountType || "FREESTANDING",
    hasOverflow: sku.hasOverflow ? "YES" : "NO",
    overflowHoleDiameter: sku.hasOverflow ? fmt(sku.overflowHoleDiameter) : "N/A",
    overflowPosition: sku.overflowPosition || "N/A",
    bracketModel: sku.bracketSpec?.bracketModel || "N/A",
    bracketCount: sku.bracketSpec ? `${sku.bracketSpec.bracketCount}` : "0",
    bracketToCenter: sku.bracketSpec?.bracketToCenter || "N/A",
    wallType: sku.bracketSpec?.wallType || "N/A",
    channelWidthIn: sku.bracketSpec ? fmt(sku.bracketSpec.channelWidthIn) : "0",
    channelDepthIn: sku.bracketSpec ? fmt(sku.bracketSpec.channelDepthIn) : "0",
    channelLengthIn: sku.bracketSpec ? fmt(sku.bracketSpec.channelLengthIn) : "0",
    channelSpacingFromCenter: sku.bracketSpec?.channelSpacingFromCenter || "N/A",
    channelDimensions: sku.bracketSpec
      ? `${fmt(sku.bracketSpec.channelWidthIn)}" wide x ${fmt(sku.bracketSpec.channelDepthIn)}" deep x ${fmt(sku.bracketSpec.channelLengthIn)}" long`
      : "N/A",
    hardwareBomText: sku.bracketSpec?.hardwareBom
      .map((h) => `- ${h.item} x ${h.qty}${h.notes ? ` (${h.notes})` : ""}`)
      .join("\n") || "No mounting hardware required",
    installNotes: sku.bracketSpec?.installNotes || "",
    reinforcementDiameter: fmt(sku.reinforcementDiameter),
    reinforcementThickness: fmt(sku.reinforcementThickness),
    longRibCount: fmt(sku.longRibCount),
    crossRibCount: fmt(sku.crossRibCount),
    ribWidth: fmt(sku.ribWidth),
    ribHeight: fmt(sku.ribHeight),
    fiberPercent: `${(sku.fiberPercent * 100).toFixed(1)}`,
    domeRiseMin: fmt(sku.domeRiseMin),
    domeRiseMax: fmt(sku.domeRiseMax),
  };

  return Object.entries(tokens).reduce(
    (result, [key, value]) => result.replaceAll(`{{${key}}}`, value),
    template,
  );
}

function buildDerivedRulesSection(rules: RuleRecord[]) {
  return rules
    .sort((left, right) => left.priority - right.priority || left.title.localeCompare(right.title))
    .map((rule) => `- [P${rule.priority}] ${rule.title}: ${rule.ruleText}`)
    .join("\n");
}

function buildDerivedQcSection(qcTemplates: QcTemplateRecord[]) {
  return qcTemplates
    .map((template) => {
      const checklist = template.checklist.map((item) => `  - ${item}`).join("\n");
      const acceptance = template.acceptanceCriteria.map((item) => `  - ${item}`).join("\n");
      const rejection = template.rejectionCriteria.map((item) => `  - ${item}`).join("\n");

      return [
        `${template.name} (${template.category})`,
        checklist ? `Checklist:\n${checklist}` : "",
        acceptance ? `Accept If:\n${acceptance}` : "",
        rejection ? `Reject If:\n${rejection}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");
}

export function resolvePacketTemplatesForSku({
  sku,
  templates,
}: {
  sku: Sku & { id?: string };
  templates: BuildPacketTemplateRecord[];
}) {
  return templates
    .filter((template) => matchesPacketScope(template, sku))
    .sort((left, right) => left.sectionOrder - right.sectionOrder);
}

export function buildPacketForSku({
  sku,
  templates,
  rules,
  qcTemplates,
}: {
  sku: Sku & { id?: string };
  templates: BuildPacketTemplateRecord[];
  rules: RuleRecord[];
  qcTemplates: QcTemplateRecord[];
}) {
  const templateSections = resolvePacketTemplatesForSku({ sku, templates }).map((template) => ({
    ...template,
    content: fillPacketTokens(template.content, sku),
  }));
  const nextSectionOrder = templateSections.at(-1)?.sectionOrder ?? 0;
  const derivedSections = [
    {
      packetKey: "derived-build-packet",
      sectionKey: "derived-rules",
      name: "Critical Manufacturing Rules",
      sectionOrder: nextSectionOrder + 1,
      categoryScope: "GLOBAL" as const,
      outputType: "BUILD_PACKET" as const,
      status: "GENERATED",
      content: buildDerivedRulesSection(rules),
    },
    {
      packetKey: "derived-build-packet",
      sectionKey: "derived-qc",
      name: "QC Gates",
      sectionOrder: nextSectionOrder + 2,
      categoryScope: "GLOBAL" as const,
      outputType: "BUILD_PACKET" as const,
      status: "GENERATED",
      content: buildDerivedQcSection(qcTemplates),
    },
  ].filter((section) => section.content.trim().length > 0);
  const sections = [...templateSections, ...derivedSections];

  return {
    sections,
    compiled: sections.map((section) => `${section.name}\n${section.content}`).join("\n\n"),
    rules,
    qcTemplates,
  };
}
