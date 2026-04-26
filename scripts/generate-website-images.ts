/**
 * Generate a catalog hero image for every ACTIVE SKU via CAF's real prompt pipeline,
 * then copy each image to the Backus Design Co website's public/images directory.
 *
 * Runs the same generateImageRenderOutput() that powers the admin Generator UI,
 * so every render is backed by a real SKU, a real scoped prompt template, and a real
 * GeneratedOutput + GeneratedImageAsset in the DB.
 *
 * Usage:
 *   node --import tsx scripts/generate-website-images.ts
 *   node --import tsx scripts/generate-website-images.ts -- --only S9-RIDGE
 *   node --import tsx scripts/generate-website-images.ts -- --skip-existing
 */

import { copyFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

import { config as loadDotenv } from "dotenv";
// Load .env.local so GEMINI_API_KEY etc. are available outside Next.js runtime.
loadDotenv({ path: path.resolve(process.cwd(), ".env.local"), quiet: true });
loadDotenv({ path: path.resolve(process.cwd(), ".env"), quiet: true });

// Website product cards use a 3:4 portrait aspect. Override CAF's default 16:9 for
// this run so catalog hero shots fit the card layout without heavy cropping.
process.env.GEMINI_IMAGE_ASPECT_RATIO = "3:4";

import { PrismaClient, type SkuCategory } from "@prisma/client";

import { generateImageRenderOutput } from "../lib/services/image-generation-service";
import type { ImageScenePreset } from "../lib/schemas/generator";

const prisma = new PrismaClient();

// Where the website's public/images lives on this machine.
const WEBSITE_ROOT = "/Users/rbackus2000/backus-design-co";

// Category → website folder + default catalog-style scene preset
const CATEGORY_CONFIG: Record<
  SkuCategory,
  { websiteDir: string; scenePreset: ImageScenePreset }
> = {
  VESSEL_SINK: { websiteDir: "sinks", scenePreset: "catalog" },
  FURNITURE: { websiteDir: "furniture", scenePreset: "catalog" },
  PANEL: { websiteDir: "slat-wall", scenePreset: "installed" },
  WALL_TILE: { websiteDir: "tile", scenePreset: "repeat_pattern" },
  HARD_GOOD: { websiteDir: "hard-goods", scenePreset: "catalog" },
};

function parseArgs() {
  const args = process.argv.slice(2);
  const out: { only: string[] | null; skipExisting: boolean; limit: number | null } = {
    only: null,
    skipExisting: false,
    limit: null,
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--only") out.only = args[++i]!.split(",").map((s) => s.trim());
    else if (a === "--skip-existing") out.skipExisting = true;
    else if (a === "--limit") out.limit = Number.parseInt(args[++i]!, 10);
  }
  return out;
}

async function main() {
  const args = parseArgs();

  const skus = await prisma.sku.findMany({
    where: { status: "ACTIVE" },
    orderBy: { code: "asc" },
  });

  let queue = skus.filter((s) => CATEGORY_CONFIG[s.category]);

  if (args.only) queue = queue.filter((s) => args.only!.includes(s.code));

  if (args.skipExisting) {
    queue = queue.filter((s) => {
      const cfg = CATEGORY_CONFIG[s.category]!;
      const target = path.join(WEBSITE_ROOT, "public", "images", cfg.websiteDir, `${s.slug}.png`);
      return !existsSync(target);
    });
  }

  if (args.limit != null) queue = queue.slice(0, args.limit);

  console.log(`Generating ${queue.length} website image(s) via CAF pipeline`);
  console.log("");

  const results: Array<{ code: string; ok: boolean; dest?: string; error?: string }> = [];
  const t0 = Date.now();

  for (const [i, sku] of queue.entries()) {
    const cfg = CATEGORY_CONFIG[sku.category]!;
    const label = `[${i + 1}/${queue.length}] ${sku.code} (${sku.category} · ${cfg.scenePreset})`;
    process.stdout.write(`${label} ... `);

    const start = Date.now();
    try {
      // Derive finish family from the SKU.finish string so prompts use the
      // correct family ("Woodform" for Woodform finishes) instead of the
      // prompt-engine's default "Classic".
      const finishRaw = sku.finish || "";
      let finishFamily: "Classic" | "Foundry" | "Industrial" | "Woodform" = "Classic";
      if (/^woodform\b/i.test(finishRaw)) finishFamily = "Woodform";
      else if (/^foundry\b/i.test(finishRaw)) finishFamily = "Foundry";
      else if (/^industrial\b/i.test(finishRaw)) finishFamily = "Industrial";

      const result = await generateImageRenderOutput({
        skuCode: sku.code,
        outputType: "IMAGE_RENDER",
        scenePreset: cfg.scenePreset,
        colorOverride: "SKU Default",
        finishOverride: finishFamily,
        sealerOverride: "Matte",
        requestedOutput: "Hero product image for the web catalog.",
        creativeDirection: "Keep the object production-aware, premium, and grounded in real manufacturable geometry.",
      });

      // Look up the saved file path via the created asset.
      const asset = await prisma.generatedImageAsset.findFirst({
        where: { generatedOutputId: result.id, status: "GENERATED" },
        orderBy: { createdAt: "desc" },
      });

      if (!asset?.filePath) {
        throw new Error("no file path returned from image service");
      }

      // Copy to website public/images/<dir>/<slug>.png
      const destDir = path.join(WEBSITE_ROOT, "public", "images", cfg.websiteDir);
      await mkdir(destDir, { recursive: true });
      const destFile = path.join(destDir, `${sku.slug}.png`);
      await copyFile(asset.filePath, destFile);

      const ms = Date.now() - start;
      console.log(`ok (${(ms / 1000).toFixed(1)}s) → ${path.relative(WEBSITE_ROOT, destFile)}`);
      results.push({ code: sku.code, ok: true, dest: destFile });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`FAILED: ${msg}`);
      results.push({ code: sku.code, ok: false, error: msg });
    }
  }

  const totalS = ((Date.now() - t0) / 1000).toFixed(1);
  const ok = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);

  console.log("");
  console.log(`Done in ${totalS}s — ${ok} ok, ${failed.length} failed.`);
  if (failed.length) {
    console.log("Failures:");
    for (const f of failed) console.log(`  ${f.code}: ${f.error}`);
  }

  await prisma.$disconnect();
  process.exit(failed.length ? 1 : 0);
}

main().catch(async (err) => {
  console.error("Fatal:", err);
  await prisma.$disconnect();
  process.exit(1);
});
