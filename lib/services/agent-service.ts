/**
 * Agent tool execution service.
 * Each function queries the Prisma database and returns structured data.
 */

import { prisma } from "../db";
import { decimalToNumber, mapSkuRecord } from "./service-helpers";
import {
  generateDesignBrief,
  generateConceptImage,
  generateProductBundle,
  saveProductBundle,
} from "./product-agent-service";
import { generateOutput } from "./generator-service";
import {
  calculateSectionPlan,
  generateSlicingSpec,
  type MoldDimensions,
} from "../engines/mold-print-engine";

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

// ── DESIGN & GENERATION HANDLERS ──────────────────────────────

async function designNewProduct(input: ToolInput) {
  const description = input.description as string;
  if (!description) return { error: "description is required." };

  const { brief, usage } = await generateDesignBrief(description);
  return {
    designBrief: brief,
    tokenUsage: usage,
    nextStep: "Review the design brief with the user. If they approve, use create_product_from_design to save it. Use generate_concept_image to visualize it first.",
  };
}

async function generateConceptImageHandler(input: ToolInput) {
  const imagePrompt = input.image_prompt as string;
  const productName = input.product_name as string;
  if (!imagePrompt || !productName) return { error: "image_prompt and product_name are required." };

  const result = await generateConceptImage(imagePrompt, productName);
  return {
    imageUrl: result.imageUrl,
    outputId: result.outputId,
    message: `Concept image generated and saved. View at ${result.imageUrl}`,
  };
}

async function createProductFromDesign(input: ToolInput) {
  const brief = {
    productName: input.product_name as string,
    category: input.category as string,
    styleDescription: input.style_description as string,
    keyFeatures: input.key_features as string[],
    suggestedDimensions: {
      outerLength: input.outer_length as number,
      outerWidth: input.outer_width as number,
      outerHeight: input.outer_height as number,
      innerDepth: input.inner_depth as number,
    },
    drainType: input.drain_type as string,
    mountType: input.mount_type as string,
    finish: input.finish as string,
    imagePrompt: input.image_prompt as string,
  };

  let bundle: Record<string, unknown>;
  let usage;
  try {
    console.log("[Jacob] Generating product bundle for:", brief.productName);
    const result = await generateProductBundle(brief);
    bundle = result.bundle as unknown as Record<string, unknown>;
    usage = result.usage;

    // Normalize: Claude sometimes returns SKU fields flat instead of nested under "sku"
    const skuObj = bundle.sku as Record<string, unknown> | undefined;
    if (!skuObj?.code && typeof bundle.code === "string") {
      console.log("[Jacob] Normalizing flat bundle structure to nested sku format");
      const { buildPacket, buildPacketSections, materials, qcChecklists, imagePrompts, ...skuFields } = bundle;
      bundle = {
        sku: skuFields,
        buildPacketSections: buildPacketSections ?? buildPacket ?? [],
        materials: materials ?? [],
        qcChecklists: qcChecklists ?? [],
        imagePrompts: imagePrompts ?? [],
      };
    }

    const normalizedSku = bundle.sku as Record<string, unknown> | undefined;
    console.log("[Jacob] Bundle generated:", normalizedSku?.code, "—", normalizedSku?.name);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[Jacob] generateProductBundle failed:", msg);
    return {
      error: `Product bundle generation failed: ${msg}. This may be a timeout or API issue. Try again or create the SKU manually at /skus/new.`,
    };
  }

  const sku = bundle.sku as Record<string, unknown> | undefined;
  if (!sku?.code) {
    console.error("[Jacob] Bundle missing sku.code. Bundle keys:", Object.keys(bundle));
    return {
      error: "The AI generated an incomplete product bundle (missing SKU code). Try again — sometimes the AI response doesn't match the expected format.",
    };
  }

  try {
    const actor = { id: "agent-jacob", username: "jacob", displayName: "Jacob (AI Agent)", role: "ADMIN" as const };
    const conceptImageUrl = (input.concept_image_url as string) ?? null;
    const typedBundle = bundle as unknown as import("../engines/product-agent-engine").ProductBundle;
    const { skuId, skuCode } = await saveProductBundle(typedBundle, conceptImageUrl, actor);

    const sections = Array.isArray(bundle.buildPacketSections) ? bundle.buildPacketSections : [];
    const mats = Array.isArray(bundle.materials) ? bundle.materials : [];
    const qcs = Array.isArray(bundle.qcChecklists) ? bundle.qcChecklists : [];

    return {
      skuCode,
      skuId,
      productName: sku.name,
      status: "DRAFT",
      buildPacketSections: sections.length,
      materials: mats.length,
      qcChecklists: qcs.length,
      tokenUsage: usage,
      message: `Created ${skuCode} (${sku.name}) in DRAFT status with ${sections.length} build packet sections, ${mats.length} materials, and ${qcs.length} QC checklists. View at /skus/${skuCode}`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[Jacob] saveProductBundle failed:", msg);
    return {
      error: `Product was generated but failed to save to database: ${msg}. The SKU code would have been ${sku.code}. Try again or create manually.`,
    };
  }
}

async function generateSkuOutput(input: ToolInput) {
  const skuCode = input.sku_code as string;
  const outputType = input.output_type as string;
  if (!skuCode || !outputType) return { error: "sku_code and output_type are required." };

  const result = await generateOutput({
    skuCode,
    outputType: outputType as "IMAGE_PROMPT" | "BUILD_PACKET" | "BLUEPRINT_PROMPT" | "ALIGNMENT_PROMPT" | "MOLD_BREAKDOWN_PROMPT" | "DETAIL_SHEET_PROMPT",
    scenePreset: (input.scene_preset as "lifestyle" | "catalog" | "detail" | "installed" | "sample" | "repeat_pattern") ?? undefined,
    requestedOutput: "Generate standard output for this SKU.",
    creativeDirection: "Follow the established design language for this product category.",
  });

  return {
    outputId: result.id,
    title: result.title,
    outputType: result.outputType,
    status: result.status,
    text: typeof result.text === "string" ? result.text.slice(0, 2000) + (result.text.length > 2000 ? "..." : "") : null,
    imageUrl: result.imageUrl ?? null,
    message: `Generated ${result.outputType} for ${skuCode}. View at /outputs/${result.id}`,
  };
}

async function calculateMoldPrintSpecs(input: ToolInput) {
  const skuCode = input.sku_code as string;
  if (!skuCode) return { error: "sku_code is required." };

  const sku = await prisma.sku.findUnique({ where: { code: skuCode } });
  if (!sku) return { error: `SKU "${skuCode}" not found.` };

  const mapped = mapSkuRecord(sku);
  const dims: MoldDimensions = {
    outerLength: mapped.outerLength,
    outerWidth: mapped.outerWidth,
    outerHeight: mapped.outerHeight,
    category: mapped.category as "VESSEL_SINK" | "FURNITURE" | "PANEL" | "WALL_TILE",
  };

  const sectionPlan = calculateSectionPlan(dims);
  const slicingSpec = generateSlicingSpec(dims, sectionPlan);

  return {
    skuCode,
    productName: mapped.name,
    moldDimensions: sectionPlan.moldDimensionsMm,
    buildVolume: { x: 400, y: 400, z: 400 },
    sectionPlan: {
      totalSections: sectionPlan.totalSections,
      fitsInOnePrint: sectionPlan.fitsInOnePrint,
      sections: sectionPlan.sections.map((s) => ({
        sectionNumber: s.sectionNumber,
        dimensions: `${s.lengthMm} x ${s.widthMm} x ${s.heightMm} mm`,
        orientation: s.orientation,
        printTimeHours: Math.round(s.printTimeMins / 60 * 10) / 10,
      })),
      bondingNotes: sectionPlan.bondingNotes,
    },
    slicingSpec: {
      layerHeight: `${slicingSpec.layerHeightMm} mm`,
      wallCount: slicingSpec.wallCount,
      infill: `${slicingSpec.infillPercent}%`,
      supports: slicingSpec.supportsEnabled ? slicingSpec.supportType : "None",
      orientation: slicingSpec.orientation,
      adhesion: slicingSpec.adhesionType,
      estimatedPrintTimeHours: slicingSpec.estimatedPrintTimeHours,
      postPrintNotes: slicingSpec.postPrintNotes,
    },
    viewMoldGenerator: `/tools/mold-generator (select ${skuCode} to see 3D preview and download STL)`,
  };
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
  design_new_product: designNewProduct,
  generate_concept_image: generateConceptImageHandler,
  create_product_from_design: createProductFromDesign,
  generate_sku_output: generateSkuOutput,
  calculate_mold_print_specs: calculateMoldPrintSpecs,
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
