/**
 * Agent tool execution service.
 * Each function queries the Prisma database and returns structured data.
 */

import { prisma } from "../db";
import { decimalToNumber } from "./service-helpers";

type ToolInput = Record<string, unknown>;

async function listSkus(input: ToolInput) {
  const where: Record<string, unknown> = {};
  if (input.category) where.category = input.category;
  if (input.status) where.status = input.status;

  const skus = await prisma.sku.findMany({
    where,
    orderBy: { code: "asc" },
    select: {
      code: true, name: true, category: true, status: true,
      type: true, finish: true, outerLength: true, outerWidth: true,
      outerHeight: true, targetWeightMinLbs: true, targetWeightMaxLbs: true,
      createdAt: true,
    },
  });

  return skus.map((sku) => ({
    code: sku.code, name: sku.name, category: sku.category, status: sku.status,
    type: sku.type, finish: sku.finish,
    outerDimensions: `${decimalToNumber(sku.outerLength) ?? 0}" x ${decimalToNumber(sku.outerWidth) ?? 0}" x ${decimalToNumber(sku.outerHeight) ?? 0}"`,
    targetWeight: `${decimalToNumber(sku.targetWeightMinLbs) ?? 0} - ${decimalToNumber(sku.targetWeightMaxLbs) ?? 0} lbs`,
    createdAt: sku.createdAt.toISOString(),
  }));
}

async function getSkuDetails(input: ToolInput) {
  const skuCode = input.sku_code as string;
  const sku = await prisma.sku.findUnique({
    where: { code: skuCode },
    include: {
      generatedOutputs: {
        take: 5, orderBy: { createdAt: "desc" },
        select: { id: true, title: true, outputType: true, status: true, createdAt: true },
      },
    },
  });

  if (!sku) return { error: `SKU "${skuCode}" not found.` };

  return {
    code: sku.code, name: sku.name, slug: sku.slug, category: sku.category,
    status: sku.status, type: sku.type, finish: sku.finish, description: sku.description,
    geometry: {
      outerLength: decimalToNumber(sku.outerLength), outerWidth: decimalToNumber(sku.outerWidth),
      outerHeight: decimalToNumber(sku.outerHeight), innerLength: decimalToNumber(sku.innerLength),
      innerWidth: decimalToNumber(sku.innerWidth), innerDepth: decimalToNumber(sku.innerDepth),
      wallThickness: decimalToNumber(sku.wallThickness), bottomThickness: decimalToNumber(sku.bottomThickness),
      topLipThickness: decimalToNumber(sku.topLipThickness), hollowCoreDepth: decimalToNumber(sku.hollowCoreDepth),
      domeRiseMin: decimalToNumber(sku.domeRiseMin), domeRiseMax: decimalToNumber(sku.domeRiseMax),
    },
    ribStructure: {
      longRibCount: sku.longRibCount, crossRibCount: sku.crossRibCount,
      ribWidth: decimalToNumber(sku.ribWidth), ribHeight: decimalToNumber(sku.ribHeight),
    },
    drain: {
      drainDiameter: decimalToNumber(sku.drainDiameter), drainType: sku.drainType,
      basinSlopeDeg: decimalToNumber(sku.basinSlopeDeg), slopeDirection: sku.slopeDirection,
    },
    mounting: {
      mountType: sku.mountType, hasOverflow: sku.hasOverflow,
      overflowHoleDiameter: decimalToNumber(sku.overflowHoleDiameter),
      overflowPosition: sku.overflowPosition, bracketSpec: sku.bracketSpecJson,
    },
    reinforcement: {
      reinforcementDiameter: decimalToNumber(sku.reinforcementDiameter),
      reinforcementThickness: decimalToNumber(sku.reinforcementThickness),
      fiberPercent: decimalToNumber(sku.fiberPercent),
    },
    moldGeometry: {
      draftAngle: decimalToNumber(sku.draftAngle), cornerRadius: decimalToNumber(sku.cornerRadius),
    },
    weight: { min: decimalToNumber(sku.targetWeightMinLbs), max: decimalToNumber(sku.targetWeightMaxLbs) },
    calculatorDefaults: sku.calculatorDefaults,
    datumSystem: sku.datumSystemJson,
    recentOutputs: sku.generatedOutputs.map((o) => ({
      id: o.id, title: o.title, outputType: o.outputType, status: o.status,
      createdAt: o.createdAt.toISOString(),
    })),
    createdAt: sku.createdAt.toISOString(), updatedAt: sku.updatedAt.toISOString(),
  };
}

async function searchRules(input: ToolInput) {
  const where: Record<string, unknown> = { status: "ACTIVE" };
  if (input.category) where.category = input.category;
  if (input.sku_category) where.skuCategory = input.sku_category;

  return prisma.rulesMaster.findMany({
    where, orderBy: [{ priority: "asc" }, { title: "asc" }],
    select: {
      code: true, title: true, category: true, categoryScope: true,
      skuCategory: true, priority: true, ruleText: true, description: true, source: true,
    },
  });
}

async function searchMaterials(input: ToolInput) {
  const where: Record<string, unknown> = { status: "ACTIVE" };
  if (input.category) where.category = input.category;

  const materials = await prisma.materialsMaster.findMany({
    where, orderBy: { code: "asc" },
    select: {
      code: true, name: true, category: true, categoryScope: true,
      skuCategory: true, unit: true, quantity: true, unitCost: true, notes: true,
    },
  });

  return materials.map((m) => ({
    ...m, quantity: decimalToNumber(m.quantity) ?? 0, unitCost: decimalToNumber(m.unitCost) ?? 0,
  }));
}

async function getRecentOutputs(input: ToolInput) {
  const where: Record<string, unknown> = {};
  if (input.output_type) where.outputType = input.output_type;
  const limit = typeof input.limit === "number" ? Math.min(input.limit, 25) : 10;

  const outputs = await prisma.generatedOutput.findMany({
    where, take: limit, orderBy: { createdAt: "desc" },
    include: {
      sku: { select: { code: true, name: true } },
      imageAssets: { take: 1, orderBy: { createdAt: "desc" }, select: { imageUrl: true, status: true } },
    },
  });

  return outputs.map((o) => ({
    id: o.id, title: o.title, skuCode: o.sku.code, skuName: o.sku.name,
    outputType: o.outputType, status: o.status, generatedBy: o.generatedBy,
    imageUrl: o.imageAssets[0]?.imageUrl ?? null, createdAt: o.createdAt.toISOString(),
  }));
}

async function getDashboardMetrics() {
  const [totalSkus, activeSkus, totalOutputs, totalRules, totalMaterials,
    totalPromptTemplates, totalPacketTemplates, totalQcTemplates, totalImages,
    slatWallProjects, equipmentItems] = await Promise.all([
    prisma.sku.count(),
    prisma.sku.count({ where: { status: "ACTIVE" } }),
    prisma.generatedOutput.count(),
    prisma.rulesMaster.count({ where: { status: "ACTIVE" } }),
    prisma.materialsMaster.count({ where: { status: "ACTIVE" } }),
    prisma.promptTemplate.count({ where: { status: "ACTIVE" } }),
    prisma.buildPacketTemplate.count({ where: { status: "ACTIVE" } }),
    prisma.qcTemplate.count({ where: { status: "ACTIVE" } }),
    prisma.generatedImageAsset.count({ where: { status: "GENERATED" } }),
    prisma.slatWallProject.count(),
    prisma.equipmentItem.count(),
  ]);

  return {
    skus: { total: totalSkus, active: activeSkus },
    generatedOutputs: totalOutputs, generatedImages: totalImages,
    rules: totalRules, materials: totalMaterials,
    promptTemplates: totalPromptTemplates, buildPacketTemplates: totalPacketTemplates,
    qcTemplates: totalQcTemplates, slatWallProjects, equipmentItems,
  };
}

async function searchPromptTemplates(input: ToolInput) {
  const where: Record<string, unknown> = { status: "ACTIVE" };
  if (input.output_type) where.outputType = input.output_type;

  return prisma.promptTemplate.findMany({
    where, orderBy: [{ outputType: "asc" }, { name: "asc" }],
    select: {
      key: true, name: true, category: true, categoryScope: true,
      skuCategory: true, outputType: true, version: true, status: true,
    },
  });
}

async function searchQcTemplates(input: ToolInput) {
  const where: Record<string, unknown> = { status: "ACTIVE" };
  if (input.category) where.category = input.category;

  return prisma.qcTemplate.findMany({
    where, orderBy: [{ category: "asc" }, { name: "asc" }],
    select: {
      templateKey: true, name: true, category: true, categoryScope: true,
      skuCategory: true, checklistJson: true, acceptanceCriteriaJson: true,
      rejectionCriteriaJson: true,
    },
  });
}

async function listSlatWallProjects(input: ToolInput) {
  const where: Record<string, unknown> = {};
  if (input.status) where.status = input.status;

  const projects = await prisma.slatWallProject.findMany({
    where, orderBy: { createdAt: "desc" },
    include: { config: true, _count: { select: { slats: true, artworks: true } } },
  });

  return projects.map((p) => ({
    code: p.code, name: p.name, status: p.status, clientName: p.clientName,
    location: p.location, designer: p.designer, description: p.description,
    config: p.config ? {
      totalSlatCount: p.config.totalSlatCount,
      slatWidth: decimalToNumber(p.config.slatWidth),
      slatHeight: decimalToNumber(p.config.slatHeight),
      slatThickness: decimalToNumber(p.config.slatThickness),
      slatSpacing: decimalToNumber(p.config.slatSpacing),
    } : null,
    slatCount: p._count.slats, artworkCount: p._count.artworks,
    createdAt: p.createdAt.toISOString(),
  }));
}

async function getEquipmentStatus(input: ToolInput) {
  const categoryWhere: Record<string, unknown> = {};
  const itemWhere: Record<string, unknown> = {};
  if (typeof input.phase === "number") {
    categoryWhere.phase = input.phase;
    itemWhere.phase = input.phase;
  }

  const [categories, items, budgets] = await Promise.all([
    prisma.equipmentCategory.findMany({ where: categoryWhere, orderBy: { sortOrder: "asc" } }),
    prisma.equipmentItem.findMany({
      where: itemWhere, orderBy: { sortOrder: "asc" },
      include: { category: { select: { name: true } } },
    }),
    prisma.equipmentBudget.findMany(),
  ]);

  const totalBudget = budgets.reduce((sum, b) => sum + b.allocatedAmount, 0);
  const totalSpent = items.filter((i) => i.actualCost !== null).reduce((sum, i) => sum + (i.actualCost ?? 0), 0);

  return {
    summary: {
      totalBudget, totalSpent, remainingBudget: totalBudget - totalSpent,
      totalItems: items.length,
      purchased: items.filter((i) => i.status === "purchased").length,
      needed: items.filter((i) => i.status === "needed").length,
    },
    categories: categories.map((c) => ({ name: c.name, phase: c.phase, phaseLabel: c.phaseLabel })),
    items: items.map((i) => ({
      name: i.name, category: i.category.name, priority: i.priority, phase: i.phase,
      status: i.status, costRange: `$${i.costLow} - $${i.costHigh}`,
      actualCost: i.actualCost ? `$${i.actualCost}` : null, supplierName: i.supplierName,
    })),
  };
}

async function searchBuildPacketTemplates(input: ToolInput) {
  const where: Record<string, unknown> = { status: "ACTIVE" };
  if (input.sku_category) where.skuCategory = input.sku_category;

  const templates = await prisma.buildPacketTemplate.findMany({
    where, orderBy: [{ sectionOrder: "asc" }, { name: "asc" }],
    select: {
      packetKey: true, sectionKey: true, name: true, sectionOrder: true,
      categoryScope: true, skuCategory: true, content: true,
    },
  });

  return templates.map((t) => ({
    packetKey: t.packetKey, sectionKey: t.sectionKey, name: t.name,
    sectionOrder: t.sectionOrder, categoryScope: t.categoryScope, skuCategory: t.skuCategory,
    contentPreview: t.content.length > 200 ? t.content.slice(0, 200) + "..." : t.content,
  }));
}

const TOOL_HANDLERS: Record<string, (input: ToolInput) => Promise<unknown>> = {
  list_skus: listSkus,
  get_sku_details: getSkuDetails,
  search_rules: searchRules,
  search_materials: searchMaterials,
  get_recent_outputs: getRecentOutputs,
  get_dashboard_metrics: getDashboardMetrics,
  search_prompt_templates: searchPromptTemplates,
  search_qc_templates: searchQcTemplates,
  list_slat_wall_projects: listSlatWallProjects,
  get_equipment_status: getEquipmentStatus,
  search_build_packet_templates: searchBuildPacketTemplates,
};

export async function executeAgentTool(
  toolName: string,
  toolInput: ToolInput,
): Promise<{ result: unknown; error?: string }> {
  const handler = TOOL_HANDLERS[toolName];
  if (!handler) return { result: null, error: `Unknown tool: ${toolName}` };

  try {
    const result = await handler(toolInput);
    return { result };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tool execution failed.";
    return { result: null, error: message };
  }
}
