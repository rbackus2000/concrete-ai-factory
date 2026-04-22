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
  const L = formatNumber(sku.outerLength);
  const W = formatNumber(sku.outerWidth);
  const H = formatNumber(sku.outerHeight);
  const iL = formatNumber(sku.innerLength);
  const iW = formatNumber(sku.innerWidth);
  const iD = formatNumber(sku.innerDepth);
  const wall = formatNumber(sku.wallThickness);
  const bottom = formatNumber(sku.bottomThickness);
  const drain = formatNumber(sku.drainDiameter);
  const isRound = sku.outerLength === sku.outerWidth;
  const shape = isRound ? "round" : "rectangular";
  const name = sku.name.toUpperCase();
  const code = sku.code;

  // Build the exact text strings the model must render — keep them short and unambiguous
  const titleLines = [
    name,
    sku.type?.toUpperCase() || "SCULPTED BASIN",
    "",
    `LENGTH:  ${L} in`,
    `WIDTH:   ${W} in`,
    `HEIGHT:  ${H} in`,
    "MATERIAL: GFRC",
    sku.drainDiameter > 0 ? `DRAIN:   ${drain} in` : "",
  ].filter(Boolean);

  const noteLines = [
    "ALL DIMENSIONS IN INCHES",
    "TOLERANCE: +/- 0.04 in",
    sku.drainDiameter > 0 ? `DRAIN OPENING ${drain} in` : "",
    sku.hasOverflow ? "OVERFLOW: YES" : "NO OVERFLOW",
    `WALL: ${wall} in`,
    "GFRC CONSTRUCTION",
  ].filter(Boolean);

  return `CRITICAL TEXT RULES — FOLLOW EXACTLY:
- Every dimension label MUST end with the two letters "in" (for inches). NEVER write "mm" or "cm".
- Spell every word correctly. Double-check: "HEIGHT" not "HE GHT", "DRAIN" not "BRAIN", "LENGTH" not "LENGHT", "TOLERANCE" not "TOLERENCE", "OVERFLOW" not "OVERPLOW".
- Copy the text strings below CHARACTER FOR CHARACTER. Do not paraphrase or abbreviate.

IMAGE DESCRIPTION:
Single-object technical blueprint. Deep cobalt blue background (#0a1628) with faint grid. White 2D orthographic line drawings only — no shading, no 3D, no gradients, no fills.

THE OBJECT: A ${shape} GFRC vessel sink, ${L} x ${W} x ${H} in.

LAYOUT — 6 PANELS:

TOP-LEFT TITLE BLOCK (plain white text, left-aligned):
${titleLines.join("\n")}

PANEL 1 — TOP VIEW (largest panel, upper-right area):
${isRound ? "Circular" : "Rectangular"} outline ${L} x ${W}. Interior contour lines for sculpted basin.${sku.drainDiameter > 0 ? ` Small circle at center for drain.` : ""} Dimension arrows labeled "${L} in" across top and "${W} in" on right side.
Label below: "TOP VIEW"

PANEL 2 — FRONT VIEW (middle row):
Side profile, width ${L} in, height ${H} in. Show wall thickness ${wall} in. Dimension arrows labeled "${L} in" across top, "${H} in" on side.
Label below: "FRONT VIEW"

PANEL 3 — SIDE VIEW (bottom-left):
End profile, width ${W} in, height ${H} in. Dimension labels "${W} in" and "${H} in".
Label below: "SIDE VIEW"

PANEL 4 — SECTION A-A (bottom-right):
Cross-section showing wall ${wall} in, bottom ${bottom} in, inner depth ${iD} in.
Label below: "SECTION A-A"

PANEL 5 — DRAIN DETAIL (small inset):
Enlarged drain circle, label "${drain} in".
Label: "DRAIN DETAIL"

PANEL 6 — CONTOUR STUDY (small inset):
Top-down contour lines of basin interior.
Label: "CONTOUR STUDY"

BOTTOM-RIGHT NOTES BLOCK (bulleted list, small white text):
${noteLines.map((l) => `- ${l}`).join("\n")}

BOTTOM-RIGHT CORNER BRAND MARK:
${code}
BACKUS DESIGN CO.

STYLE: Precise, minimal, architectural. White lines on dark blue. Measurement arrows with tick marks. All labels in clean sans-serif or monospace font. Generous negative space. Professional engineering drawing.`;
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
