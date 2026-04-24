/**
 * Copy the most recent successful IMAGE_RENDER for a SKU from CAF's
 * public/generated-images/ into the Backus Design Co website's public/images tree.
 *
 * Usage:
 *   node --import tsx scripts/pull-to-website.ts P9-DUNE
 *   node --import tsx scripts/pull-to-website.ts P6-STAVE P7-RHYTHM P8-KINETIC
 */

import path from "node:path";
import { copyFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";

import { config as loadDotenv } from "dotenv";
loadDotenv({ path: path.resolve(process.cwd(), ".env.local"), quiet: true });
loadDotenv({ path: path.resolve(process.cwd(), ".env"), quiet: true });

import { PrismaClient, type SkuCategory } from "@prisma/client";

const prisma = new PrismaClient();

const WEBSITE_ROOT = "/Users/rbackus2000/backus-design-co";

const DIR_BY_CATEGORY: Record<SkuCategory, string> = {
  VESSEL_SINK: "sinks",
  FURNITURE: "furniture",
  PANEL: "slat-wall",
  WALL_TILE: "tile",
};

async function pullOne(code: string) {
  const sku = await prisma.sku.findUnique({ where: { code } });
  if (!sku) {
    console.log(`[${code}] SKU not found`);
    return false;
  }

  const asset = await prisma.generatedImageAsset.findFirst({
    where: {
      status: "GENERATED",
      filePath: { not: null },
      generatedOutput: {
        skuId: sku.id,
        outputType: "IMAGE_RENDER",
        status: "GENERATED",
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!asset?.filePath) {
    console.log(`[${code}] no generated image asset on disk`);
    return false;
  }

  if (!existsSync(asset.filePath)) {
    console.log(`[${code}] DB asset points to missing file: ${asset.filePath}`);
    return false;
  }

  const dir = DIR_BY_CATEGORY[sku.category];
  if (!dir) {
    console.log(`[${code}] unsupported category ${sku.category}`);
    return false;
  }

  const destDir = path.join(WEBSITE_ROOT, "public", "images", dir);
  await mkdir(destDir, { recursive: true });
  const destFile = path.join(destDir, `${sku.slug}.png`);
  await copyFile(asset.filePath, destFile);
  console.log(`[${code}] ok → ${path.relative(WEBSITE_ROOT, destFile)}  (from ${path.basename(asset.filePath)}, ${asset.createdAt.toISOString().slice(0, 19)})`);
  return true;
}

async function main() {
  const codes = process.argv.slice(2);
  if (codes.length === 0) {
    console.error("Usage: node --import tsx scripts/pull-to-website.ts CODE [CODE ...]");
    process.exit(1);
  }

  for (const code of codes) {
    await pullOne(code);
  }
}

main()
  .catch((err) => {
    console.error("failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
