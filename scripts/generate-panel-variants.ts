/**
 * Generate 3 color-variant renders per slat-wall-art panel SKU (P6-P9).
 *
 * Key difference from regular IMAGE_RENDER: we pass the SKU's most-recent
 * hero render as a Gemini reference image AND override the reference
 * instruction so the geometry/relief is locked to the hero but the color +
 * room are allowed to vary. Without this, each variant rolls the dice
 * on surface pattern and invents a new product design.
 *
 * Output: persists GeneratedOutput + GeneratedImageAsset rows in CAF DB
 * AND copies into the website repo at <slug>-alt{1,2,3}.png for thumbnails.
 *
 * Usage: node --import tsx scripts/generate-panel-variants.ts
 */

import path from "node:path";
import { copyFile, mkdir } from "node:fs/promises";

import { config as loadDotenv } from "dotenv";
loadDotenv({ path: path.resolve(process.cwd(), ".env.local"), quiet: true });
loadDotenv({ path: path.resolve(process.cwd(), ".env"), quiet: true });

process.env.GEMINI_IMAGE_ASPECT_RATIO = "3:4";

import { Prisma, PrismaClient } from "@prisma/client";
import {
  generateImageWithGemini,
  getSkuReferenceImagePath,
} from "../lib/services/image-generation-service";

const prisma = new PrismaClient();

const WEBSITE_ROOT = "/Users/rbackus2000/backus-design-co";
const WEBSITE_DIR = path.join(WEBSITE_ROOT, "public", "images", "slat-wall");

const GEOMETRY_LOCK_INSTRUCTION =
  "REFERENCE IMAGE: The attached image shows the APPROVED physical product design. You MUST keep the panel's surface relief pattern, module size, relief depth, edge profile, and overall silhouette EXACTLY as shown in the reference — this is the locked mold geometry and must not change. What you SHOULD change: the finish color/tone and the room setting (different furniture, different ambient lighting, different interior style). Do NOT invent a new surface pattern or change the relief geometry.";

type Variant = {
  color: string;
  finishFamily: "Classic" | "Woodform";
  label: string;
  roomHint: string;
};

const PLAN: Array<{ code: string; slug: string; variants: Variant[] }> = [
  {
    code: "P6-STAVE",
    slug: "p6-stave",
    variants: [
      { color: "Ember", finishFamily: "Woodform", label: "Woodform Ember", roomHint: "bright modern residential living room with cream sofa and oak coffee table" },
      { color: "Forest", finishFamily: "Woodform", label: "Woodform Forest", roomHint: "luxury hotel corridor with linen bench and brass accents" },
      { color: "Shadow", finishFamily: "Classic", label: "Classic Shadow", roomHint: "minimalist gallery foyer with polished concrete floor" },
    ],
  },
  {
    code: "P7-RHYTHM",
    slug: "p7-rhythm",
    variants: [
      { color: "Linen", finishFamily: "Classic", label: "Classic Linen", roomHint: "airy daylit office lounge with pale oak furniture" },
      { color: "Pewter", finishFamily: "Classic", label: "Classic Pewter", roomHint: "upscale restaurant waiting area with leather banquette" },
      { color: "Shadow", finishFamily: "Classic", label: "Classic Shadow", roomHint: "moody speakeasy lounge with velvet armchairs and warm edison lamps" },
    ],
  },
  {
    code: "P8-KINETIC",
    slug: "p8-kinetic",
    variants: [
      { color: "Carbon", finishFamily: "Classic", label: "Classic Carbon", roomHint: "sleek corporate lobby with polished stone floor" },
      { color: "Storm", finishFamily: "Classic", label: "Classic Storm", roomHint: "contemporary art gallery white room" },
      { color: "Pewter", finishFamily: "Classic", label: "Classic Pewter", roomHint: "premium condo entry with walnut bench and pendant lighting" },
    ],
  },
  {
    code: "P9-DUNE",
    slug: "p9-dune",
    variants: [
      { color: "Mist", finishFamily: "Woodform", label: "Woodform Mist", roomHint: "bright coastal residential living room with white linen upholstery" },
      { color: "Forest", finishFamily: "Woodform", label: "Woodform Forest", roomHint: "warm mid-century lounge with olive leather armchairs" },
      { color: "Mocha", finishFamily: "Woodform", label: "Woodform Mocha", roomHint: "moody hotel library with deep green walls and brass lamps" },
    ],
  },
];

function buildVariantPrompt(opts: {
  skuCode: string;
  productName: string;
  finishLabel: string;
  colorName: string;
  roomHint: string;
}) {
  return `Lifestyle interior photograph of the ${opts.skuCode} ${opts.productName} — a color variant rendered in ${opts.finishLabel}.

Finish and tone:
Apply the ${opts.finishLabel} finish across the entire panel surface. ${opts.colorName} is the dominant material color. Keep the surface relief EXACTLY as shown in the reference image — only the color / material tone should change.

Installation setting:
${opts.roomHint}. Ambient interior lighting, one or two upholstered seating pieces, a warm lamp, a rug or side table. Wide-to-medium interior shot at relaxed eye-level. The wall stretches through the frame as the focal element. No people.

Composition:
3:4 portrait orientation. The wall runs along one side with comfortable space around it so the room feels lived-in.

Negative constraints:
Do NOT invent a new surface pattern. Do NOT change the panel relief or module layout. Do NOT show a flat featureless wall — the relief pattern must match the reference exactly. No product-photography isolation. No people.`;
}

async function persistVariant(opts: {
  skuId: string;
  skuCode: string;
  promptText: string;
  variantLabel: string;
  colorName: string;
  finishFamily: string;
  referenceImagePath: string | null;
}) {
  // Create the GeneratedOutput shell first so assets have an ID to attach to.
  const created = await prisma.generatedOutput.create({
    data: {
      skuId: opts.skuId,
      title: `${opts.skuCode} IMAGE RENDER · INSTALLED · ${opts.variantLabel}`,
      outputType: "IMAGE_RENDER",
      status: "QUEUED",
      inputPayload: {
        skuCode: opts.skuCode,
        outputType: "IMAGE_RENDER",
        scenePreset: "installed",
        colorOverride: opts.colorName,
        finishOverride: opts.finishFamily,
        sealerOverride: "Matte",
        requestedOutput: `Color variant — ${opts.variantLabel}`,
        creativeDirection: "Color variant using hero as geometry reference.",
      } as Prisma.InputJsonValue,
      outputPayload: {
        promptText: opts.promptText,
        text: opts.promptText,
        scenePreset: "installed",
        variantLabel: opts.variantLabel,
        imageStatus: "QUEUED",
        referenceImagePath: opts.referenceImagePath,
      } as Prisma.InputJsonValue,
      generatedBy: "panel-variants-script",
    },
  });

  try {
    const providerResult = await generateImageWithGemini({
      generatedOutputId: created.id,
      promptText: opts.promptText,
      referenceImagePath: opts.referenceImagePath,
      referenceInstruction: GEOMETRY_LOCK_INSTRUCTION,
    });

    const asset = await prisma.generatedImageAsset.create({
      data: {
        generatedOutputId: created.id,
        promptTextUsed: opts.promptText,
        modelName: providerResult.modelName,
        imageUrl: providerResult.imageUrl,
        filePath: providerResult.filePath,
        status: "GENERATED",
        width: providerResult.width,
        height: providerResult.height,
        metadataJson: providerResult.metadataJson,
      },
    });

    await prisma.generatedOutput.update({
      where: { id: created.id },
      data: {
        status: "GENERATED",
        outputPayload: {
          promptText: opts.promptText,
          text: opts.promptText,
          scenePreset: "installed",
          variantLabel: opts.variantLabel,
          imageStatus: "GENERATED",
          imageAssetId: asset.id,
          imageUrl: asset.imageUrl,
          filePath: asset.filePath,
          width: asset.width,
          height: asset.height,
          modelName: asset.modelName,
          referenceImagePath: opts.referenceImagePath,
        } as Prisma.InputJsonValue,
      },
    });

    return { ok: true as const, filePath: asset.filePath };
  } catch (err) {
    await prisma.generatedOutput.update({
      where: { id: created.id },
      data: {
        status: "FAILED",
        outputPayload: {
          promptText: opts.promptText,
          text: opts.promptText,
          scenePreset: "installed",
          variantLabel: opts.variantLabel,
          imageStatus: "FAILED",
          errorMessage: err instanceof Error ? err.message : String(err),
        } as Prisma.InputJsonValue,
      },
    });
    return { ok: false as const, error: err instanceof Error ? err.message : String(err) };
  }
}

async function main() {
  const t0 = Date.now();
  const results: Array<{ code: string; alt: number; ok: boolean; info: string }> = [];

  for (const sku of PLAN) {
    const skuRow = await prisma.sku.findUnique({ where: { code: sku.code } });
    if (!skuRow) {
      console.log(`[${sku.code}] SKU not found — skipping`);
      continue;
    }

    const referenceImagePath = await getSkuReferenceImagePath(skuRow.id);
    if (!referenceImagePath) {
      console.log(`[${sku.code}] no existing hero image to reference — run the hero generator first`);
      continue;
    }
    console.log(`[${sku.code}] using reference: ${path.basename(referenceImagePath)}`);

    for (const [i, variant] of sku.variants.entries()) {
      const altIndex = i + 1;
      const label = `${sku.code} alt${altIndex} (${variant.label})`;
      process.stdout.write(`  ${label} ... `);
      const start = Date.now();

      const promptText = buildVariantPrompt({
        skuCode: sku.code,
        productName: skuRow.name,
        finishLabel: variant.label,
        colorName: variant.color,
        roomHint: variant.roomHint,
      });

      const r = await persistVariant({
        skuId: skuRow.id,
        skuCode: sku.code,
        promptText,
        variantLabel: variant.label,
        colorName: variant.color,
        finishFamily: variant.finishFamily,
        referenceImagePath,
      });

      const ms = Date.now() - start;
      if (r.ok && r.filePath) {
        await mkdir(WEBSITE_DIR, { recursive: true });
        const destFile = path.join(WEBSITE_DIR, `${sku.slug}-alt${altIndex}.png`);
        await copyFile(r.filePath, destFile);
        console.log(`ok (${(ms / 1000).toFixed(1)}s) → ${path.relative(WEBSITE_ROOT, destFile)}`);
        results.push({ code: sku.code, alt: altIndex, ok: true, info: destFile });
      } else if (r.ok && !r.filePath) {
        console.log(`ok (${(ms / 1000).toFixed(1)}s) but filePath null — skipped copy`);
        results.push({ code: sku.code, alt: altIndex, ok: true, info: "(no file copied)" });
      } else {
        console.log(`FAILED: ${r.ok ? "unknown" : r.error}`);
        results.push({ code: sku.code, alt: altIndex, ok: false, info: r.ok ? "unknown" : r.error });
      }
    }
  }

  const totalS = ((Date.now() - t0) / 1000).toFixed(1);
  const ok = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);
  console.log("");
  console.log(`Done in ${totalS}s — ${ok} ok, ${failed.length} failed.`);
  if (failed.length) {
    for (const f of failed) console.log(`  ${f.code} alt${f.alt}: ${f.info}`);
  }
}

main()
  .catch((err) => {
    console.error("fatal:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
