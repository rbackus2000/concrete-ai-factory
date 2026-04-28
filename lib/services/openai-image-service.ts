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

// ── Common style header — shared by every category builder ──
const BLUEPRINT_STYLE_HEADER = `CRITICAL TEXT RULES — FOLLOW EXACTLY:
- Every dimension label MUST end with the two letters "in" (for inches). NEVER write "mm" or "cm".
- Spell every word correctly. Double-check: "HEIGHT" not "HE GHT", "DEPTH" not "DEPHT", "LENGTH" not "LENGHT", "TOLERANCE" not "TOLERENCE", "WIDTH" not "WIDHT".
- Copy the text strings below CHARACTER FOR CHARACTER. Do not paraphrase or abbreviate.

IMAGE DESCRIPTION:
Single-object technical blueprint. Deep cobalt blue background (#0a1628) with faint grid. White 2D orthographic line drawings only — no shading, no 3D, no gradients, no fills.
`;

const BLUEPRINT_STYLE_FOOTER =
  "STYLE: Precise, minimal, architectural. White lines on dark blue. Measurement arrows with tick marks. All labels in clean sans-serif or monospace font. Generous negative space. Professional engineering drawing.";

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
  const drainType = (sku.drainType || "Round").toLowerCase();
  const isRound = sku.outerLength === sku.outerWidth;
  const shape = isRound ? "round" : "rectangular";
  const name = sku.name.toUpperCase();
  const code = sku.code;

  // Build drain-specific descriptions
  let drainShapeDesc: string;
  let drainDetailDesc: string;
  let drainTopViewDesc: string;
  if (drainType === "slot") {
    drainShapeDesc = `linear slot drain, ${drain} in wide`;
    drainDetailDesc = `Enlarged view of the SLOT DRAIN — a narrow rectangular opening ${drain} in wide running along the basin floor. Draw as a long thin rectangle with dimension arrow labeled "${drain} in". NOT a circle.`;
    drainTopViewDesc = `Thin rectangular slot drain at basin center (NOT circular).`;
  } else if (drainType === "grid") {
    drainShapeDesc = `grid drain, ${drain} in square`;
    drainDetailDesc = `Enlarged view of the GRID DRAIN — a square grate pattern ${drain} in x ${drain} in. Draw as a square with internal grid lines and dimension arrow labeled "${drain} in". NOT a circle.`;
    drainTopViewDesc = `Square grid drain at basin center (NOT circular).`;
  } else {
    drainShapeDesc = `round drain, ${drain} in diameter`;
    drainDetailDesc = `Enlarged view of the ROUND DRAIN — a circular opening ${drain} in diameter. Draw as a circle with dimension arrow labeled "${drain} in".`;
    drainTopViewDesc = `Small circle at center for round drain.`;
  }

  // Build the exact text strings the model must render — keep them short and unambiguous
  const drainTypeLabel = drainType === "slot" ? "SLOT" : drainType === "grid" ? "GRID" : "ROUND";
  const titleLines = [
    name,
    sku.type?.toUpperCase() || "SCULPTED BASIN",
    "",
    `LENGTH:  ${L} in`,
    `WIDTH:   ${W} in`,
    `HEIGHT:  ${H} in`,
    "MATERIAL: GFRC",
    sku.drainDiameter > 0 ? `DRAIN:   ${drainTypeLabel} ${drain} in` : "",
  ].filter(Boolean);

  const noteLines = [
    "ALL DIMENSIONS IN INCHES",
    "TOLERANCE: +/- 0.04 in",
    sku.drainDiameter > 0 ? `${drainTypeLabel} DRAIN ${drain} in` : "",
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

THE OBJECT: A ${shape} GFRC vessel sink, ${L} x ${W} x ${H} in.${sku.drainDiameter > 0 ? ` Equipped with a ${drainShapeDesc}.` : ""}

LAYOUT — 6 PANELS:

TOP-LEFT TITLE BLOCK (plain white text, left-aligned):
${titleLines.join("\n")}

PANEL 1 — TOP VIEW (largest panel, upper-right area):
${isRound ? "Circular" : "Rectangular"} outline ${L} x ${W}. Interior contour lines for sculpted basin.${sku.drainDiameter > 0 ? ` ${drainTopViewDesc}` : ""} Dimension arrows labeled "${L} in" across top and "${W} in" on right side.
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
${drainDetailDesc}
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

// ── FURNITURE blueprint ──
function buildFurnitureBlueprintPrompt(sku: ReturnType<typeof mapSkuRecord>): string {
  const L = formatNumber(sku.outerLength);
  const W = formatNumber(sku.outerWidth);
  const H = formatNumber(sku.outerHeight);
  const wall = formatNumber(sku.wallThickness);
  const code = sku.code;
  const name = sku.name.toUpperCase();
  const isHollow = (sku.hollowCoreDepth ?? 0) > 0;
  return `${BLUEPRINT_STYLE_HEADER}
THE OBJECT: A GFRC furniture piece — ${sku.name}, ${L} x ${W} x ${H} in. ${isHollow ? `Hollow core construction with ${wall} in walls.` : "Solid construction."}

LAYOUT — 6 PANELS:

TOP-LEFT TITLE BLOCK (plain white text, left-aligned):
${name}
${(sku.type || "FURNITURE").toUpperCase()}

LENGTH:  ${L} in
WIDTH:   ${W} in
HEIGHT:  ${H} in
MATERIAL: GFRC

PANEL 1 — TOP VIEW (largest panel, upper-right area):
Rectangular outline ${L} x ${W} in. Show the upper surface — flat top, edge profile visible. Dimension arrows labeled "${L} in" across top and "${W} in" on right side.
Label below: "TOP VIEW"

PANEL 2 — FRONT ELEVATION (middle row):
Front face profile, width ${L} in, height ${H} in. Show wall thickness ${wall} in if hollow. Dimension arrows labeled "${L} in" across top, "${H} in" on side.
Label below: "FRONT ELEVATION"

PANEL 3 — SIDE ELEVATION (bottom-left):
Side profile, width ${W} in, height ${H} in. Dimension labels "${W} in" and "${H} in".
Label below: "SIDE ELEVATION"

PANEL 4 — SECTION A-A (bottom-right):
Cross-section showing internal structure. ${isHollow ? `Wall thickness ${wall} in around hollow core.` : "Solid section with optional internal rib reinforcement."}
Label below: "SECTION A-A"

PANEL 5 — EDGE DETAIL (small inset):
Enlarged corner profile showing edge treatment, chamfer, or bullnose if applicable. Dimension arrow for edge thickness.
Label: "EDGE DETAIL"

PANEL 6 — MOUNTING / BASE DETAIL (small inset):
Bottom view or base footprint showing leveling pads, leg attachment points, or flat bearing surface.
Label: "BASE DETAIL"

BOTTOM-RIGHT NOTES BLOCK (bulleted list, small white text):
- ALL DIMENSIONS IN INCHES
- TOLERANCE: +/- 0.04 in
- WALL: ${wall} in${isHollow ? " (HOLLOW CORE)" : " (SOLID)"}
- GFRC CONSTRUCTION

BOTTOM-RIGHT CORNER BRAND MARK:
${code}
BACKUS DESIGN CO.

${BLUEPRINT_STYLE_FOOTER}`;
}

// ── PANEL (slat wall / wall panel) blueprint ──
// Mounting system is a real Z-clip / French cleat: Monarch MZA-1.5"
// aluminum extrusion, surface-bonded to the back of the panel with
// G/Flex epoxy + 4× #10 SS screws into pre-cast pilot holes. Wall
// half attaches to studs at 16" o.c. Load rating: 100 lb / linear ft.
// Number of clip pairs: 1 per 24" of panel length, min 2.
function buildPanelBlueprintPrompt(sku: ReturnType<typeof mapSkuRecord>): string {
  const L = formatNumber(sku.outerLength);
  const W = formatNumber(sku.outerWidth);
  const H = formatNumber(sku.outerHeight);
  const code = sku.code;
  const name = sku.name.toUpperCase();
  const clipPairs = Math.max(2, Math.ceil((sku.outerLength ?? 24) / 24));
  return `${BLUEPRINT_STYLE_HEADER}
THE OBJECT: A GFRC architectural wall panel — ${sku.name}, ${L} x ${W} x ${H} in. Surface relief / texture visible on the face. Wall-mounted via concealed Z-clip (French cleat) system bonded to the back.

LAYOUT — 6 PANELS:

TOP-LEFT TITLE BLOCK (plain white text, left-aligned):
${name}
${(sku.type || "WALL PANEL").toUpperCase()}

LENGTH:  ${L} in
WIDTH:   ${W} in
DEPTH:   ${H} in
MATERIAL: GFRC
MOUNT:   Z-CLIP (${clipPairs} PAIRS)

PANEL 1 — FACE VIEW (largest panel, upper-right area):
Rectangular outline ${L} x ${W} in showing the front face pattern (slats, ribs, waves, or relief geometry). Dimension arrows labeled "${L} in" across top and "${W} in" on right side.
Label below: "FACE VIEW"

PANEL 2 — REAR VIEW with clip layout (middle row):
Rear face of the panel. Show ${clipPairs} horizontal Z-clip extrusions across the back, each labeled "Z-CLIP — Monarch MZA-1.5" 8 in long". Distribute evenly along the length, set in 4 in from each end. Show the 4 screw holes per clip (small circles). Add overall dimension "${L} in" across top, "${W} in" on side.
Label below: "REAR VIEW — CLIP LAYOUT"

PANEL 3 — SECTION A-A — Z-CLIP DETAIL (bottom-left, MUST BE PROMINENT):
Cross-section showing the panel mounted on a wall. Two interlocking aluminum Z-clip profiles drawn in detail:
- Wall-side clip: Z-shaped extrusion screwed into the wall stud with two arrows labeled "WOOD SCREW INTO STUD"
- Panel-side clip: matching Z-shaped extrusion bonded to the panel back, with arrow labeled "EPOXY + 4× #10 SS SCREWS"
- Show the interlocking profile clearly with the upper hook of the wall clip caught by the lower hook of the panel clip
- Label gap "1/16 in PANEL-TO-WALL CLEARANCE"
- Label clip extrusion "1.5 in ALUMINUM Z-CLIP"
Label below: "SECTION A-A — Z-CLIP DETAIL"

PANEL 4 — SIDE EDGE PROFILE (bottom-right):
End profile of the panel showing depth ${H} in. Show the Z-clip protruding from the back by 0.5 in. Dimension labels "${W} in" height and "${H} in" depth.
Label below: "SIDE EDGE"

PANEL 5 — SURFACE DETAIL (small inset):
Enlarged repeat of one slat, rib, or relief unit with depth and spacing dimensions.
Label: "SURFACE DETAIL"

PANEL 6 — MOUNTING HARDWARE (small inset):
Exploded isometric of the Z-clip pair: top extrusion (panel-side) above, bottom extrusion (wall-side) below, with arrows showing how they engage. Label "MONARCH MZA-1.5 Z-CLIP" and "BUNDLED PER PANEL".
Label: "MOUNTING HARDWARE"

BOTTOM-RIGHT NOTES BLOCK (bulleted list, small white text):
- ALL DIMENSIONS IN INCHES
- TOLERANCE: +/- 0.04 in
- PANEL DEPTH: ${H} in
- GFRC CONSTRUCTION
- MOUNT: Z-CLIP, ${clipPairs} PAIRS BUNDLED
- LOAD: 100 LB / LINEAR FT
- WALL: 16 IN O.C. STUDS

BOTTOM-RIGHT CORNER BRAND MARK:
${code}
BACKUS DESIGN CO.

${BLUEPRINT_STYLE_FOOTER}`;
}

// ── WALL_TILE blueprint ──
function buildTileBlueprintPrompt(sku: ReturnType<typeof mapSkuRecord>): string {
  const L = formatNumber(sku.outerLength);
  const W = formatNumber(sku.outerWidth);
  const H = formatNumber(sku.outerHeight);
  const code = sku.code;
  const name = sku.name.toUpperCase();
  return `${BLUEPRINT_STYLE_HEADER}
THE OBJECT: A GFRC wall tile — ${sku.name}, ${L} x ${W} in face, ${H} in thick. Sold by the tile or square foot, installed in a repeat pattern.

LAYOUT — 6 PANELS:

TOP-LEFT TITLE BLOCK (plain white text, left-aligned):
${name}
${(sku.type || "WALL TILE").toUpperCase()}

LENGTH:  ${L} in
WIDTH:   ${W} in
THICKNESS: ${H} in
MATERIAL: GFRC

PANEL 1 — TILE FACE (largest panel, upper-right area):
Single tile face — outline ${L} x ${W} in showing the surface texture or relief. Dimension arrows labeled "${L} in" and "${W} in".
Label below: "TILE FACE"

PANEL 2 — REPEAT PATTERN (middle row):
3x3 tile field showing how tiles align and the recommended joint spacing.
Label below: "REPEAT PATTERN"

PANEL 3 — EDGE PROFILE (bottom-left):
Cross-section through one tile edge showing thickness ${H} in and any edge bevel or chamfer.
Label below: "EDGE PROFILE"

PANEL 4 — SECTION A-A (bottom-right):
Vertical section through a tile in-place — substrate, thinset bed, tile body, surface finish.
Label below: "SECTION A-A"

PANEL 5 — JOINT DETAIL (small inset):
Enlarged joint between two tiles showing recommended grout or open-joint spacing.
Label: "JOINT DETAIL"

PANEL 6 — TEXTURE DETAIL (small inset):
Close-up of the surface relief or finish character.
Label: "TEXTURE DETAIL"

BOTTOM-RIGHT NOTES BLOCK (bulleted list, small white text):
- ALL DIMENSIONS IN INCHES
- TOLERANCE: +/- 0.04 in
- THICKNESS: ${H} in
- GFRC CONSTRUCTION
- THINSET MORTAR INSTALL

BOTTOM-RIGHT CORNER BRAND MARK:
${code}
BACKUS DESIGN CO.

${BLUEPRINT_STYLE_FOOTER}`;
}

// ── HARD_GOOD blueprint (bowls, planters, candle holders, trays) ──
function buildHardGoodBlueprintPrompt(sku: ReturnType<typeof mapSkuRecord>): string {
  const L = formatNumber(sku.outerLength);
  const W = formatNumber(sku.outerWidth);
  const H = formatNumber(sku.outerHeight);
  const iL = formatNumber(sku.innerLength);
  const iW = formatNumber(sku.innerWidth);
  const iD = formatNumber(sku.innerDepth);
  const wall = formatNumber(sku.wallThickness);
  const code = sku.code;
  const name = sku.name.toUpperCase();
  const hasCavity = (sku.innerLength ?? 0) > 0 || (sku.innerWidth ?? 0) > 0;
  const isRound = sku.outerLength === sku.outerWidth;
  const shape = isRound ? "round" : "rectangular";
  return `${BLUEPRINT_STYLE_HEADER}
THE OBJECT: A small GFRC hard good — ${sku.name}, ${L} x ${W} x ${H} in (${shape}). ${hasCavity ? `Interior cavity ${iL} x ${iW} x ${iD} in.` : "Solid object."}

LAYOUT — 6 PANELS:

TOP-LEFT TITLE BLOCK (plain white text, left-aligned):
${name}
${(sku.type || "HARD GOOD").toUpperCase()}

LENGTH:  ${L} in
WIDTH:   ${W} in
HEIGHT:  ${H} in
MATERIAL: GFRC

PANEL 1 — TOP VIEW (largest panel, upper-right area):
${isRound ? "Circular" : "Rectangular"} outline ${L} x ${W} in. ${hasCavity ? `Interior cavity outline ${iL} x ${iW} in centered.` : ""} Dimension arrows labeled "${L} in" across top and "${W} in" on right side.
Label below: "TOP VIEW"

PANEL 2 — FRONT ELEVATION (middle row):
Side profile, width ${L} in, height ${H} in. ${hasCavity ? `Interior cavity depth ${iD} in shown.` : ""}
Label below: "FRONT ELEVATION"

PANEL 3 — SIDE ELEVATION (bottom-left):
End profile, width ${W} in, height ${H} in.
Label below: "SIDE ELEVATION"

PANEL 4 — SECTION A-A (bottom-right):
${hasCavity ? `Vertical section showing wall thickness ${wall} in and cavity depth ${iD} in.` : `Solid cross-section showing wall ${wall} in.`}
Label below: "SECTION A-A"

PANEL 5 — EDGE / RIM DETAIL (small inset):
${hasCavity ? "Enlarged rim profile showing thickness and edge treatment." : "Enlarged edge profile."}
Label: "EDGE DETAIL"

PANEL 6 — BASE DETAIL (small inset):
Base footprint and contact surface.
Label: "BASE DETAIL"

BOTTOM-RIGHT NOTES BLOCK (bulleted list, small white text):
- ALL DIMENSIONS IN INCHES
- TOLERANCE: +/- 0.04 in
- WALL: ${wall} in
- GFRC CONSTRUCTION

BOTTOM-RIGHT CORNER BRAND MARK:
${code}
BACKUS DESIGN CO.

${BLUEPRINT_STYLE_FOOTER}`;
}

/**
 * Dispatch to the right blueprint builder based on SKU category.
 * Care kits skip blueprints (consumables, no geometry).
 */
function buildBlueprintPromptForSku(sku: ReturnType<typeof mapSkuRecord>): string | null {
  switch (sku.category) {
    case "VESSEL_SINK":
      return buildBlueprintPrompt(sku);
    case "FURNITURE":
      return buildFurnitureBlueprintPrompt(sku);
    case "PANEL":
      return buildPanelBlueprintPrompt(sku);
    case "WALL_TILE":
      return buildTileBlueprintPrompt(sku);
    case "HARD_GOOD":
      return buildHardGoodBlueprintPrompt(sku);
    case "CARE_KIT":
      return null;
    default:
      // Best-effort: treat unknown categories as hard goods.
      return buildHardGoodBlueprintPrompt(sku);
  }
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

  const promptText = buildBlueprintPromptForSku(mapped);
  if (!promptText) {
    throw new Error(
      `Blueprint generation is not supported for category ${sku.category} (${sku.code}).`,
    );
  }

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
