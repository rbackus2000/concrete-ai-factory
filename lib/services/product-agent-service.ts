import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { prisma } from "../db";
import { callClaude, callClaudeForJson } from "./claude-service";
import { mapSkuRecord } from "./service-helpers";
import {
  buildProductAgentSystemPrompt,
  type ProductBundle,
} from "../engines/product-agent-engine";
import type { ActionActor } from "../auth/session";

// ── Step 1: Generate Design Brief from simple prompt ──────────

type DesignBrief = {
  productName: string;
  category: string;
  styleDescription: string;
  keyFeatures: string[];
  suggestedDimensions: {
    outerLength: number;
    outerWidth: number;
    outerHeight: number;
    innerDepth: number;
  };
  drainType: string;
  mountType: string;
  finish: string;
  imagePrompt: string;
};

export async function generateDesignBrief(simplePrompt: string): Promise<{
  brief: DesignBrief;
  usage: { input: number; output: number };
}> {
  const systemPrompt = `You are a senior GFRC product designer at RB Studio, a concrete manufacturing company.

Given a simple product idea, you research current trends in architectural concrete products and generate a detailed design brief. You have deep knowledge of:
- Concrete sink design (vessel, ramp, rectangle, organic forms)
- GFRC furniture (tables, benches, planters, pedestals)
- Concrete wall panels and tiles
- Manufacturing constraints (mold-making, draft angles, wall thickness)
- Current design trends in luxury concrete fixtures

CATEGORIES: VESSEL_SINK, FURNITURE, PANEL

STANDARD DIMENSIONS (inches):
- Vessel sinks: 16-30" long, 13-16" wide, 5-6" tall, 5" inner depth
- Ramp sinks: 24-36" long, 13-16" wide, 5-6" tall
- Furniture: varies widely
- Panels: 8-24" per side, 0.5-1.25" thick

MOUNT TYPES: WALL_MOUNT_STUD (sinks), VESSEL_TOP_MOUNT (bowls), FREESTANDING (furniture), WALL_ADHESIVE (panels)
DRAIN TYPES: Round, Slot, Grid, or "" (none)
FINISHES: Classic Frost, Classic Pewter, Classic Smoke, Classic Dust, Classic Dune, Classic Storm, Classic Moss, Classic Night, Foundry Iron, Foundry Copper, Foundry Bronze, Industrial Raw, Industrial Acid, Industrial Carbon, Woodform Dune, Woodform Grove, Woodform Ember, Woodform Twilight, Woodform Sage, Woodform Storm, Woodform Drift, Woodform Charcoal

For the imagePrompt field, write a detailed prompt for an AI image generator. Describe:
- The exact product sitting in a realistic setting (bathroom, kitchen, showroom)
- Material: GFRC concrete with specific finish texture
- Lighting: soft studio lighting or natural light
- Camera: 3/4 angle, close enough to see texture detail
- Style: commercial architectural product photography, hyperrealistic, premium quality
- The image should look like a real photo from a design catalog

Respond with ONLY valid JSON matching this type:
{
  "productName": "string",
  "category": "VESSEL_SINK" | "FURNITURE" | "PANEL",
  "styleDescription": "2-3 sentence design description",
  "keyFeatures": ["feature1", "feature2", ...],
  "suggestedDimensions": { "outerLength": number, "outerWidth": number, "outerHeight": number, "innerDepth": number },
  "drainType": "Round" | "Slot" | "Grid" | "",
  "mountType": "WALL_MOUNT_STUD" | "VESSEL_TOP_MOUNT" | "FREESTANDING" | "WALL_ADHESIVE",
  "finish": "one of the finish names above",
  "imagePrompt": "detailed image generation prompt"
}`;

  const { data, usage } = await callClaudeForJson<DesignBrief>({
    systemPrompt,
    userPrompt: simplePrompt,
    maxTokens: 2000,
  });

  return { brief: data, usage };
}

// ── Step 2: Generate concept image via Gemini ─────────────────

export async function generateConceptImage(imagePrompt: string, productName: string): Promise<{
  imageUrl: string;
  filePath: string | null;
  outputId: string;
}> {
  const config = getGeminiConfig();

  // Create GeneratedOutput record FIRST so the image is always persisted
  const anySku = await prisma.sku.findFirst({ where: { status: "ACTIVE" } });
  if (!anySku) throw new Error("At least one active SKU is required.");

  const output = await prisma.generatedOutput.create({
    data: {
      skuId: anySku.id,
      title: `Product Agent Concept — ${productName}`,
      outputType: "IMAGE_RENDER",
      status: "GENERATED",
      inputPayload: { source: "product-agent", productName, imagePrompt },
      outputPayload: { text: imagePrompt, promptText: imagePrompt },
      generatedBy: "product-agent",
    },
  });

  const response = await fetch(
    `${config.baseUrl}/models/${config.model}:generateContent?key=${encodeURIComponent(config.apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: imagePrompt }] }],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
          imageConfig: {
            aspectRatio: "16:9",
            imageSize: "2K",
          },
        },
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini image generation failed (${response.status}): ${errorText.substring(0, 200)}`);
  }

  const result = await response.json();
  const candidates = result?.candidates ?? [];

  for (const candidate of candidates) {
    for (const part of candidate?.content?.parts ?? []) {
      if (part?.inlineData?.data) {
        const filename = `${output.id}.png`;
        const imageUrl = `/api/images/${output.id}`;

        // Try writing to disk (works locally, fails on Vercel)
        let filePath: string | null = null;
        try {
          const directory = path.join(process.cwd(), "public", "generated-images");
          const absolutePath = path.join(directory, filename);
          await mkdir(directory, { recursive: true });
          await writeFile(absolutePath, Buffer.from(part.inlineData.data, "base64"));
          filePath = absolutePath;
        } catch {
          // Vercel read-only filesystem
        }

        // Save GeneratedImageAsset record with base64 for Vercel serving
        await prisma.generatedImageAsset.create({
          data: {
            generatedOutputId: output.id,
            promptTextUsed: imagePrompt,
            modelName: config.model,
            imageUrl,
            filePath,
            status: "GENERATED",
            width: 2048,
            height: 1152,
            metadataJson: { source: "product-agent", productName, imageBase64: part.inlineData.data },
          },
        });

        return { imageUrl, filePath, outputId: output.id };
      }
    }
  }

  throw new Error("Gemini did not return an image. Try a different description.");
}

function getGeminiConfig() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is required for image generation.");
  return {
    apiKey,
    baseUrl: process.env.GEMINI_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta",
    model: process.env.GEMINI_IMAGE_MODEL ?? "gemini-3-pro-image-preview",
  };
}

// ── Step 3: Generate full product bundle from approved design ─

export async function generateProductBundle(brief: DesignBrief): Promise<{
  bundle: ProductBundle;
  usage: { input: number; output: number };
}> {
  // Fetch example SKUs for context
  const exampleRecords = await prisma.sku.findMany({
    where: { code: { in: ["S1-EROSION", "F1-MONOLITH", "P1-RIDGE"] } },
  });
  const exampleSkus = exampleRecords.map(mapSkuRecord);

  // Get existing codes
  const allSkus = await prisma.sku.findMany({ select: { code: true } });
  const existingCodes = allSkus.map((s) => s.code);

  const systemPrompt = buildProductAgentSystemPrompt(exampleSkus);

  const userPrompt = `Create a complete product specification based on this APPROVED design brief:

PRODUCT: ${brief.productName}
CATEGORY: ${brief.category}
STYLE: ${brief.styleDescription}
KEY FEATURES: ${brief.keyFeatures.join(", ")}
DIMENSIONS: ${brief.suggestedDimensions.outerLength}" x ${brief.suggestedDimensions.outerWidth}" x ${brief.suggestedDimensions.outerHeight}", inner depth ${brief.suggestedDimensions.innerDepth}"
DRAIN: ${brief.drainType || "None"}
MOUNT: ${brief.mountType}
FINISH: ${brief.finish}

EXISTING SKU CODES (do not reuse): ${existingCodes.join(", ")}
Pick the next available number in the ${brief.category === "VESSEL_SINK" ? "S" : brief.category === "FURNITURE" ? "F" : "P"} series.

Generate the complete ProductBundle JSON with all fields populated.`;

  const { data, usage } = await callClaudeForJson<ProductBundle>({
    systemPrompt,
    userPrompt,
    maxTokens: 12000,
  });

  return { bundle: data, usage };
}

// ── Step 4: Save Product Bundle to Database ───────────────────

export async function saveProductBundle(
  bundle: ProductBundle,
  conceptImageUrl: string | null,
  actor: ActionActor,
): Promise<{ skuId: string; skuCode: string }> {
  const { sku: rawSku, buildPacketSections, materials, qcChecklists } = bundle;

  // Normalize targetWeight — Claude sometimes returns flat fields instead of nested object
  const skuAny = rawSku as Record<string, unknown>;
  const targetWeightMin = rawSku.targetWeight?.min
    ?? (skuAny.targetWeightMin as number)
    ?? (skuAny.targetWeightMinLbs as number)
    ?? 20;
  const targetWeightMax = rawSku.targetWeight?.max
    ?? (skuAny.targetWeightMax as number)
    ?? (skuAny.targetWeightMaxLbs as number)
    ?? 40;
  const sku = rawSku;

  // Resolve pricing — Claude should provide it, fall back to category defaults
  const retailPrice = Number(skuAny.retailPrice ?? 0);
  const wholesalePrice = Number(skuAny.wholesalePrice ?? 0);

  const skuRecord = await prisma.sku.create({
    data: {
      code: sku.code,
      slug: sku.slug ?? sku.code.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      name: sku.name,
      category: sku.category,
      status: "DRAFT",
      type: sku.type,
      finish: sku.finish,
      description: sku.summary ?? (skuAny.description as string) ?? "",
      retailPrice: retailPrice > 0 ? retailPrice : null,
      wholesalePrice: wholesalePrice > 0 ? wholesalePrice : null,
      targetWeightMinLbs: targetWeightMin,
      targetWeightMaxLbs: targetWeightMax,
      outerLength: sku.outerLength ?? 0,
      outerWidth: sku.outerWidth ?? 0,
      outerHeight: sku.outerHeight ?? 0,
      innerLength: sku.innerLength ?? 0,
      innerWidth: sku.innerWidth ?? 0,
      innerDepth: sku.innerDepth ?? 0,
      wallThickness: sku.wallThickness ?? 0.6,
      bottomThickness: sku.bottomThickness ?? 0.75,
      topLipThickness: sku.topLipThickness ?? 1,
      hollowCoreDepth: sku.hollowCoreDepth ?? 0,
      domeRiseMin: sku.domeRiseMin ?? 0,
      domeRiseMax: sku.domeRiseMax ?? 0,
      longRibCount: sku.longRibCount ?? 0,
      crossRibCount: sku.crossRibCount ?? 0,
      ribWidth: sku.ribWidth ?? 0,
      ribHeight: sku.ribHeight ?? 0,
      drainDiameter: sku.drainDiameter ?? 0,
      drainType: sku.drainType || null,
      basinSlopeDeg: sku.basinSlopeDeg ?? null,
      slopeDirection: sku.slopeDirection || null,
      mountType: sku.mountType || null,
      hasOverflow: sku.hasOverflow ?? false,
      overflowHoleDiameter: sku.overflowHoleDiameter ?? null,
      overflowPosition: sku.overflowPosition || null,
      bracketSpecJson: (skuAny.bracketSpec as object) ?? undefined,
      reinforcementDiameter: sku.reinforcementDiameter ?? 0,
      reinforcementThickness: sku.reinforcementThickness ?? 0,
      draftAngle: sku.draftAngle ?? 3,
      cornerRadius: sku.cornerRadius ?? 0.25,
      fiberPercent: sku.fiberPercent ?? 0.025,
      datumSystemJson: (skuAny.datumSystem as object[]) ?? [],
      calculatorDefaults: (skuAny.calculatorDefaults as object) ?? {},
    },
  });

  // Build Packet Sections — normalize field names (Claude returns varying shapes)
  const packetKey = `${sku.code.toLowerCase()}-build-packet`;
  if (Array.isArray(buildPacketSections)) {
    await Promise.all(
      buildPacketSections.map((rawSection, idx) => {
        const s = rawSection as Record<string, unknown>;
        return prisma.buildPacketTemplate.create({
          data: {
            packetKey,
            sectionKey: (s.sectionKey ?? s.key ?? s.section_key ?? `section-${idx + 1}`) as string,
            name: (s.name ?? s.title ?? s.sectionName ?? `Section ${idx + 1}`) as string,
            sectionOrder: (s.sectionOrder ?? s.order ?? s.section_order ?? idx + 1) as number,
            categoryScope: "SKU_OVERRIDE",
            skuOverrideId: skuRecord.id,
            outputType: "BUILD_PACKET",
            status: "ACTIVE",
            content: (s.content ?? s.text ?? s.body ?? "") as string,
          },
        });
      }),
    );
  }

  // Materials — normalize field names
  if (Array.isArray(materials)) {
    const validCategories = ["GFRC", "FACE_COAT", "BACKING_MIX", "PIGMENT", "REINFORCEMENT", "INSERT", "SEALER", "PACKAGING", "HARDWARE"];
    await Promise.all(
      materials.map((rawMat) => {
        const m = rawMat as Record<string, unknown>;
        const cat = String(m.category ?? "GFRC").toUpperCase();
        return prisma.materialsMaster.create({
          data: {
            code: (m.code ?? m.materialCode ?? `MAT-${sku.code}`) as string,
            name: (m.name ?? m.materialName ?? "Material") as string,
            category: (validCategories.includes(cat) ? cat : "GFRC") as "GFRC",
            categoryScope: "SKU_OVERRIDE",
            skuOverrideId: skuRecord.id,
            status: "ACTIVE",
            unit: (m.unit ?? "lbs") as string,
            quantity: Number(m.quantity ?? 0),
            unitCost: Number(m.unitCost ?? m.unit_cost ?? 0),
            notes: (m.notes ?? "") as string,
          },
        });
      }),
    );
  }

  // QC Checklists — normalize field names
  if (Array.isArray(qcChecklists)) {
    const validQcCats = ["SETUP", "PRE_DEMOLD", "POST_DEMOLD", "ALIGNMENT"];
    await Promise.all(
      qcChecklists.map((rawQc) => {
        const q = rawQc as Record<string, unknown>;
        const cat = String(q.category ?? "SETUP").toUpperCase();
        return prisma.qcTemplate.create({
          data: {
            templateKey: (q.templateKey ?? q.template_key ?? q.key ?? `qc-${sku.code.toLowerCase()}`) as string,
            name: (q.name ?? q.title ?? "QC Checklist") as string,
            category: (validQcCats.includes(cat) ? cat : "SETUP") as "SETUP",
            categoryScope: "SKU_OVERRIDE",
            skuOverrideId: skuRecord.id,
            status: "ACTIVE",
            checklistJson: (q.checklist ?? q.checklistItems ?? []) as string[],
            acceptanceCriteriaJson: (q.acceptanceCriteria ?? q.acceptance ?? []) as string[],
            rejectionCriteriaJson: (q.rejectionCriteria ?? q.rejection ?? []) as string[],
          },
        });
      }),
    );
  }

  // Audit log
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      actorName: actor.displayName,
      actorRole: actor.role,
      entityType: "SKU",
      entityId: skuRecord.id,
      action: "CREATE",
      summary: `Product Agent created ${sku.code} (${sku.name}) — ${buildPacketSections.length} sections, ${materials.length} materials, ${qcChecklists.length} QC checklists`,
      changedFields: {
        source: "product-agent",
        code: sku.code,
        conceptImageUrl,
      },
    },
  });

  return { skuId: skuRecord.id, skuCode: skuRecord.code };
}
