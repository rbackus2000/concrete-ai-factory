import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { mapSkuRecord, buildScopedWhere } from "./service-helpers";
import { resolveRulesForSku, type RuleRecord } from "../engines/rules-engine";
import type { GeneratorFormValues } from "../schemas/generator";

function getApiKey() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is required for blueprint generation.");
  return key;
}

function formatNumber(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "—";
  return Number(n).toFixed(2);
}

function buildBlueprintPrompt(sku: ReturnType<typeof mapSkuRecord>): string {
  const dims = {
    outerL: formatNumber(sku.outerLength),
    outerW: formatNumber(sku.outerWidth),
    outerH: formatNumber(sku.outerHeight),
    innerL: formatNumber(sku.innerLength),
    innerW: formatNumber(sku.innerWidth),
    innerD: formatNumber(sku.innerDepth),
    wall: formatNumber(sku.wallThickness),
    bottom: formatNumber(sku.bottomThickness),
    drain: formatNumber(sku.drainDiameter),
  };

  const isRound = sku.outerLength === sku.outerWidth;
  const shapeDesc = isRound
    ? `circular/round vessel bowl, ${dims.outerL} in diameter x ${dims.outerH} in tall`
    : `rectangular vessel sink, ${dims.outerL} x ${dims.outerW} x ${dims.outerH} inches`;

  return `Single-object technical blueprint of the "${sku.name}" — a hand-cast GFRC ${shapeDesc}.

Deep cobalt blue background (#0a1628) with subtle grid lines. Clean white 2D orthographic line drawing only. No shading, no lighting effects, no 3D rendering.

Layout (6 panels on one sheet):
1. TOP VIEW (largest, top-center): ${isRound ? "Circular" : "Rectangular"} outer profile ${dims.outerL} x ${dims.outerW} in. Interior basin contour lines showing sculpted depth. ${sku.drainDiameter > 0 ? `Centered drain opening ∅${dims.drain} in.` : ""} Dimension arrows on all sides.
2. FRONT VIEW (below top view): Profile showing height ${dims.outerH} in, wall thickness ${dims.wall} in, basin depth ${dims.innerD} in.
3. SIDE VIEW (bottom-left): ${isRound ? "Same as front (circular symmetry)" : `Width profile ${dims.outerW} in x ${dims.outerH} in`}.
4. SECTION A-A (bottom-right): Cross-section cut through center showing wall thickness ${dims.wall} in, bottom thickness ${dims.bottom} in, interior basin shape.
5. DRAIN DETAIL (small inset, bottom-left): Enlarged view of drain area, ∅${dims.drain} in opening.
6. CONTOUR STUDY (small inset): Top-down contour map of basin interior depth.

Title block (top-left):
${sku.name.toUpperCase()}
${sku.type || "SCULPTED BASIN"}
LENGTH: ${dims.outerL} in
WIDTH: ${dims.outerW} in
HEIGHT: ${dims.outerH} in
MATERIAL: GFRC
${sku.drainDiameter > 0 ? `DRAIN ∅: ${dims.drain} in` : ""}

Notes block (bottom-right):
• ALL DIMENSIONS IN INCHES
• TOLERANCE: ±0.04 in
${sku.drainDiameter > 0 ? `• DRAIN OPENING ∅${dims.drain} in` : ""}
• ${sku.hasOverflow ? "OVERFLOW INCLUDED" : "NO OVERFLOW"}
• WALL THICKNESS: ${dims.wall} in
• GFRC CONSTRUCTION

Brand mark (bottom-right corner):
${sku.code}
BACKUS DESIGN CO.

Style: Precise architectural blueprint. Measurement ticks with arrows. Minimal technical labels in inches. Balanced layout with negative space. White lines on dark blue. Professional engineering drawing aesthetic.`;
}

export async function generateBlueprintOutput(values: GeneratorFormValues) {
  const sku = await prisma.sku.findUnique({ where: { code: values.skuCode } });
  if (!sku) throw new Error(`SKU ${values.skuCode} not found.`);

  const mapped = { id: sku.id, ...mapSkuRecord(sku) };
  const scopeWhere = buildScopedWhere(sku);

  const ruleRows = await prisma.rulesMaster.findMany({
    where: { status: "ACTIVE", AND: [scopeWhere] },
    orderBy: [{ priority: "asc" }],
  });

  const rules = resolveRulesForSku({
    sku: mapped,
    rules: ruleRows.map((r): RuleRecord => ({
      code: r.code, title: r.title, category: r.category,
      categoryScope: r.categoryScope, skuCategory: r.skuCategory,
      skuOverrideId: r.skuOverrideId, outputType: r.outputType,
      status: r.status, priority: r.priority,
      description: r.description ?? "", ruleText: r.ruleText, source: r.source ?? "",
    })),
  });

  const promptText = buildBlueprintPrompt(mapped);

  // Create the output record
  const output = await prisma.generatedOutput.create({
    data: {
      skuId: sku.id,
      title: `${sku.code} BLUEPRINT`,
      outputType: "BLUEPRINT_RENDER",
      status: "QUEUED",
      inputPayload: values as Prisma.InputJsonValue,
      outputPayload: {
        text: `Output Type: BLUEPRINT_RENDER\nSKU: ${sku.code}\n\n${promptText}`,
        promptText,
        rulesApplied: rules.map((r) => ({
          code: r.code, title: r.title, priority: r.priority, ruleText: r.ruleText,
        })),
      } as Prisma.InputJsonValue,
      generatedBy: "openai-blueprint-generator",
    },
  });

  // Call OpenAI gpt-image-1
  try {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getApiKey()}`,
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt: promptText,
        n: 1,
        size: "1024x1536",
        quality: "high",
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenAI API error: ${response.status} — ${err}`);
    }

    const result = await response.json();
    const b64 = result.data?.[0]?.b64_json as string | undefined;

    if (!b64) throw new Error("OpenAI returned no image data.");

    const imageUrl = `/api/images/${output.id}`;

    const asset = await prisma.generatedImageAsset.create({
      data: {
        generatedOutputId: output.id,
        promptTextUsed: promptText,
        modelName: "gpt-image-1",
        imageUrl,
        filePath: null,
        status: "GENERATED",
        width: 1024,
        height: 1536,
        metadataJson: { imageBase64: b64, provider: "openai", model: "gpt-image-1" },
      },
    });

    await prisma.generatedOutput.update({
      where: { id: output.id },
      data: {
        status: "GENERATED",
        outputPayload: {
          text: `Output Type: BLUEPRINT_RENDER\nSKU: ${sku.code}\n\n${promptText}`,
          promptText,
          imageStatus: "GENERATED",
          imageAssetId: asset.id,
          imageUrl: asset.imageUrl,
          width: 1024,
          height: 1536,
          modelName: "gpt-image-1",
          rulesApplied: rules.map((r) => ({
            code: r.code, title: r.title, priority: r.priority, ruleText: r.ruleText,
          })),
        } as Prisma.InputJsonValue,
      },
    });

    return {
      id: output.id,
      title: `${sku.code} BLUEPRINT`,
      outputType: "BLUEPRINT_RENDER" as const,
      status: "GENERATED",
      skuCode: sku.code,
      createdAt: output.createdAt.toISOString(),
      promptTemplateKey: null,
      buildPacketSectionKey: null,
      text: `Output Type: BLUEPRINT_RENDER\nSKU: ${sku.code}\n\n${promptText}`,
      promptText,
      imageUrl: asset.imageUrl,
    };
  } catch (error) {
    await prisma.generatedOutput.update({
      where: { id: output.id },
      data: { status: "FAILED" },
    });
    throw error;
  }
}
