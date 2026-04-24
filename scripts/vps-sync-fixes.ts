/**
 * One-off production sync:
 *   1) Seed the wall-tile_image_repeat_pattern IMAGE_RENDER template (missing on VPS).
 *   2) Backfill retail/wholesale prices for P1-P5 (currently null on VPS).
 *
 * Run with the VPS DATABASE_URL exported.
 */

import path from "node:path";
import { config as loadDotenv } from "dotenv";
loadDotenv({ path: path.resolve(process.cwd(), ".env.local"), quiet: true });
loadDotenv({ path: path.resolve(process.cwd(), ".env"), quiet: true });

import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const WALL_TILE_TEMPLATE_BODY = `Ultra-realistic product render showing multiple {{skuCode}} {{productName}} tiles arranged in a repeat pattern.

Product type: {{productType}}.
Design intent: {{productDescription}}

Focus:
Demonstrate how the tile repeats, aligns, and reads across a surface. The distinctive face texture, carving, or relief described above must be visible on every tile across the pattern. Edge profile {{edgeProfile}}. {{finish}} finish — {{finishDescription}}. Module size {{tileLength}} x {{tileWidth}} inches, thickness {{tileThickness}} inches.

Environment:
Minimal architectural context or semi-studio layout that keeps attention on the repeating pattern. Raking light across the surface to reveal relief and grout lines.

Negative constraints:
No flat featureless tiles when the design specifies face relief. No faucet. No drain. No unrelated furniture. No pattern distortion. No inconsistent tile sizing.`;

const PANEL_PRICES = [
  { code: "P1-RIDGE", retail: 145, wholesale: 80 },
  { code: "P2-DUNE", retail: 245, wholesale: 135 },
  { code: "P3-FLUTE", retail: 245, wholesale: 135 },
  { code: "P4-BRICK", retail: 85, wholesale: 47 },
  { code: "P5-ASHLAR", retail: 165, wholesale: 91 },
];

async function seedWallTileTemplate() {
  // Check if it already exists (by key).
  const existing = await prisma.promptTemplate.findFirst({
    where: { key: "wall-tile_image_repeat_pattern" },
  });

  if (existing) {
    const updated = await prisma.promptTemplate.update({
      where: { id: existing.id },
      data: { templateBody: WALL_TILE_TEMPLATE_BODY, status: "ACTIVE" },
    });
    console.log(`wall-tile template: UPDATED (${updated.key})`);
    return;
  }

  const created = await prisma.promptTemplate.create({
    data: {
      key: "wall-tile_image_repeat_pattern",
      name: "Wall Tile Image Repeat Pattern",
      category: "IMAGE_PROMPT",
      categoryScope: "SKU_CATEGORY",
      skuCategory: "WALL_TILE",
      outputType: "IMAGE_RENDER",
      status: "ACTIVE",
      version: 1,
      templateBody: WALL_TILE_TEMPLATE_BODY,
      variablesJson: ["skuCode", "productName", "productType", "productDescription", "finish", "finishDescription", "edgeProfile", "tileLength", "tileWidth", "tileThickness"],
    },
  });
  console.log(`wall-tile template: CREATED (${created.key})`);
}

async function backfillPanelPrices() {
  for (const p of PANEL_PRICES) {
    const result = await prisma.sku.update({
      where: { code: p.code },
      data: {
        retailPrice: new Prisma.Decimal(p.retail),
        wholesalePrice: new Prisma.Decimal(p.wholesale),
      },
      select: { code: true, retailPrice: true, wholesalePrice: true },
    });
    console.log(`  ${result.code}: retail=${result.retailPrice}, wholesale=${result.wholesalePrice}`);
  }
}

async function main() {
  console.log("Seeding wall-tile template...");
  await seedWallTileTemplate();
  console.log("");
  console.log("Backfilling P1-P5 prices...");
  await backfillPanelPrices();
}

main()
  .catch((err) => {
    console.error("failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
