/**
 * Fill out the 8-color palette for each slat-wall panel (P6-P9).
 *
 * For each SKU, determines the finish family (Classic / Woodform) and
 * generates any missing color variants via CAF with the hero as a Gemini
 * reference image + geometry-lock instruction (so only color/room varies,
 * not the relief).
 *
 * Skips colors that already exist on disk as <slug>-<color>.png.
 *
 * Usage: node --import tsx scripts/fill-panel-color-palette.ts
 */

import path from "node:path";
import { copyFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";

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

// Palettes mirror lib/schemas/generator.ts colorOptions.
const CLASSIC_COLORS = ["Linen", "Frost", "Beach", "Graphite", "Pewter", "Storm", "Shadow", "Carbon"] as const;
const WOODFORM_COLORS = ["Mist", "Dune", "Fog", "Forest", "Grove", "Twilight", "Mocha", "Ember"] as const;

type ColorRoomHint = { color: string; roomHint: string };

const ROOM_HINTS: Record<string, string> = {
  // Classic palette
  Linen: "airy daylit residential living room with pale oak furniture and linen upholstery",
  Frost: "bright minimalist gallery foyer with polished concrete floor",
  Beach: "sunlit coastal hotel lounge with rope accents and woven rugs",
  Graphite: "contemporary office reception with walnut desk and leather chair",
  Pewter: "upscale restaurant waiting area with leather banquette and brass accents",
  Storm: "moody corporate lobby with polished stone floor and tufted bench",
  Shadow: "luxury hotel corridor with linen bench and recessed cove lighting",
  Carbon: "sleek high-rise residential entry with dark walnut console and stone floor",

  // Woodform palette
  Mist: "bright coastal residential living room with white linen upholstery and airy curtains",
  Dune: "warm Mediterranean hotel lounge with terracotta tile and rattan armchairs",
  Fog: "minimalist Scandinavian living room with pale oak floor and cream seating",
  Forest: "warm mid-century lounge with olive leather armchairs and brass lamps",
  Grove: "dark hospitality library with deep walnut shelving and warm edison lamps",
  Twilight: "moody speakeasy lounge with velvet armchairs and dim warm lighting",
  Mocha: "deep-toned hotel library with green walls and brass reading lamps",
  Ember: "intimate dining room with dark walnut table and brass pendants",
};

const GEOMETRY_LOCK_INSTRUCTION =
  "REFERENCE IMAGE: The attached image shows the APPROVED physical product design. You MUST keep the panel's surface relief pattern, module size, relief depth, edge profile, and overall silhouette EXACTLY as shown in the reference — this is the locked mold geometry and must not change. What you SHOULD change: the finish color/tone and the room setting (different furniture, different ambient lighting, different interior style). Do NOT invent a new surface pattern or change the relief geometry.";

type PanelPlan = {
  code: string;
  slug: string;
  family: "Classic" | "Woodform";
  heroColor: string; // the color the existing hero represents (mapped to palette)
};

const PLAN: PanelPlan[] = [
  { code: "P6-STAVE", slug: "p6-stave", family: "Woodform", heroColor: "Grove" },
  { code: "P7-RHYTHM", slug: "p7-rhythm", family: "Classic", heroColor: "Graphite" },
  { code: "P8-KINETIC", slug: "p8-kinetic", family: "Classic", heroColor: "Shadow" },
  { code: "P9-DUNE", slug: "p9-dune", family: "Woodform", heroColor: "Dune" },
];

function buildVariantPrompt(opts: {
  skuCode: string;
  productName: string;
  family: "Classic" | "Woodform";
  color: string;
}) {
  const roomHint = ROOM_HINTS[opts.color] ?? "premium hospitality or residential interior";
  const finishLabel = `${opts.family} ${opts.color}`;
  return `Lifestyle interior photograph of the ${opts.skuCode} ${opts.productName} rendered in ${finishLabel}.

Finish:
Apply ${finishLabel} across the entire panel surface. ${opts.color} is the dominant material color. Keep the surface relief EXACTLY as shown in the reference image — only the color / material tone should change.

Interior setting:
${roomHint}. Ambient interior lighting, one or two upholstered seating pieces, a warm lamp, a rug or side table. Wide-to-medium shot at relaxed eye-level. The wall stretches through the frame as the focal element. No people.

Composition: 3:4 portrait orientation. The wall runs along one side with livable space around it.

Negative constraints:
Do NOT invent a new surface pattern. Do NOT change the panel relief or module layout. Do NOT show a flat featureless wall. No product isolation. No people.`;
}

async function persistOne(opts: {
  skuId: string;
  skuCode: string;
  slug: string;
  family: "Classic" | "Woodform";
  color: string;
  referenceImagePath: string;
}) {
  const promptText = buildVariantPrompt({
    skuCode: opts.skuCode,
    productName: "", // filled below
    family: opts.family,
    color: opts.color,
  });

  const label = `${opts.family} ${opts.color}`;
  const created = await prisma.generatedOutput.create({
    data: {
      skuId: opts.skuId,
      title: `${opts.skuCode} IMAGE RENDER · INSTALLED · ${label}`,
      outputType: "IMAGE_RENDER",
      status: "QUEUED",
      inputPayload: {
        skuCode: opts.skuCode,
        outputType: "IMAGE_RENDER",
        scenePreset: "installed",
        colorOverride: opts.color,
        finishOverride: opts.family,
        sealerOverride: "Matte",
        requestedOutput: `Color palette — ${label}`,
        creativeDirection: "Color variant using hero as geometry reference.",
      } as Prisma.InputJsonValue,
      outputPayload: {
        promptText,
        variantLabel: label,
        imageStatus: "QUEUED",
        referenceImagePath: opts.referenceImagePath,
      } as Prisma.InputJsonValue,
      generatedBy: "panel-palette-fill-script",
    },
  });

  try {
    const providerResult = await generateImageWithGemini({
      generatedOutputId: created.id,
      promptText,
      referenceImagePath: opts.referenceImagePath,
      referenceInstruction: GEOMETRY_LOCK_INSTRUCTION,
    });

    const asset = await prisma.generatedImageAsset.create({
      data: {
        generatedOutputId: created.id,
        promptTextUsed: promptText,
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
          promptText,
          variantLabel: label,
          imageStatus: "GENERATED",
          imageAssetId: asset.id,
          imageUrl: asset.imageUrl,
          filePath: asset.filePath,
          referenceImagePath: opts.referenceImagePath,
        } as Prisma.InputJsonValue,
      },
    });

    if (!asset.filePath) throw new Error("no filePath");
    await mkdir(WEBSITE_DIR, { recursive: true });
    const destFile = path.join(WEBSITE_DIR, `${opts.slug}-${opts.color.toLowerCase()}.png`);
    await copyFile(asset.filePath, destFile);
    return { ok: true as const, file: destFile };
  } catch (err) {
    await prisma.generatedOutput.update({
      where: { id: created.id },
      data: {
        status: "FAILED",
        outputPayload: {
          promptText,
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
  const results: Array<{ label: string; ok: boolean; info: string }> = [];

  for (const panel of PLAN) {
    const sku = await prisma.sku.findUnique({ where: { code: panel.code } });
    if (!sku) { console.log(`[${panel.code}] not found`); continue; }

    const referenceImagePath = await getSkuReferenceImagePath(sku.id);
    if (!referenceImagePath) {
      console.log(`[${panel.code}] no reference image — run hero generator first`);
      continue;
    }

    const palette = panel.family === "Woodform" ? WOODFORM_COLORS : CLASSIC_COLORS;
    const needed = palette.filter((c) => c !== panel.heroColor);

    console.log(`[${panel.code}] family=${panel.family}, hero=${panel.heroColor}, ref=${path.basename(referenceImagePath)}`);

    for (const color of needed) {
      const destFile = path.join(WEBSITE_DIR, `${panel.slug}-${color.toLowerCase()}.png`);
      if (existsSync(destFile)) {
        console.log(`  ${color}: skip (already on disk)`);
        results.push({ label: `${panel.code}/${color}`, ok: true, info: "skipped" });
        continue;
      }

      process.stdout.write(`  ${color} ... `);
      const start = Date.now();
      const r = await persistOne({
        skuId: sku.id,
        skuCode: panel.code,
        slug: panel.slug,
        family: panel.family,
        color,
        referenceImagePath,
      });
      const ms = Date.now() - start;
      if (r.ok) {
        console.log(`ok (${(ms / 1000).toFixed(1)}s) → ${path.relative(WEBSITE_ROOT, r.file)}`);
        results.push({ label: `${panel.code}/${color}`, ok: true, info: r.file });
      } else {
        console.log(`FAILED: ${r.error}`);
        results.push({ label: `${panel.code}/${color}`, ok: false, info: r.error });
      }
    }
  }

  const totalS = ((Date.now() - t0) / 1000).toFixed(1);
  const ok = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);
  console.log("");
  console.log(`Done in ${totalS}s — ${ok} ok, ${failed.length} failed.`);
  if (failed.length) for (const f of failed) console.log(`  ${f.label}: ${f.info}`);
}

main()
  .catch((err) => { console.error("fatal:", err); process.exit(1); })
  .finally(() => prisma.$disconnect());
