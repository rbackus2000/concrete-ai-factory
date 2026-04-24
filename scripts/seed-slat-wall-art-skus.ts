/**
 * Seed 4 Slat-Wall-Art SKUs into CAF.
 *
 * P6-STAVE  — vertical deep stave grooves, Woodform Grove
 * P7-RHYTHM — varied-width vertical rhythm relief, Matte Natural Gray
 * P8-KINETIC — varied-depth kinetic fins, Matte Charcoal
 * P9-DUNE   — undulating horizontal dune curves, Woodform Dune
 *
 * Usage: node --import tsx scripts/seed-slat-wall-art-skus.ts
 */

import path from "node:path";
import { config as loadDotenv } from "dotenv";
loadDotenv({ path: path.resolve(process.cwd(), ".env.local"), quiet: true });
loadDotenv({ path: path.resolve(process.cwd(), ".env"), quiet: true });

import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type NewSku = {
  code: string;
  slug: string;
  name: string;
  type: string;
  finish: string;
  description: string;
  outerLength: number;
  outerWidth: number;
  outerHeight: number;
  retailPrice: number;
  wholesalePrice: number;
  targetWeightMinLbs: number;
  targetWeightMaxLbs: number;
};

const NEW_SKUS: NewSku[] = [
  {
    code: "P6-STAVE",
    slug: "p6-stave",
    name: "Stave Slat Wall Panel",
    type: "GFRC Woodform Slat Wall Panel",
    finish: "Woodform Grove",
    description:
      "48x12 slat wall art panel with deep vertical stave grooves, cast against real wood-grain molds. Dark warm-brown wood tone reads as reclaimed lumber. Designed for feature walls, acoustic-rated hospitality spaces, and architectural commissions.",
    outerLength: 48,
    outerWidth: 12,
    outerHeight: 1.0,
    retailPrice: 780,
    wholesalePrice: 430,
    targetWeightMinLbs: 14,
    targetWeightMaxLbs: 18,
  },
  {
    code: "P7-RHYTHM",
    slug: "p7-rhythm",
    name: "Rhythm Wall Panel",
    type: "GFRC Varied-Width Fluted Wall Panel",
    finish: "Matte Natural Gray",
    description:
      "36x12 slat wall art panel with varied-width vertical relief. Alternating narrow and wide flutes create a syncopated rhythm across the surface. Matte natural-gray concrete finish for a disciplined architectural presence.",
    outerLength: 36,
    outerWidth: 12,
    outerHeight: 1.0,
    retailPrice: 620,
    wholesalePrice: 340,
    targetWeightMinLbs: 11,
    targetWeightMaxLbs: 14,
  },
  {
    code: "P8-KINETIC",
    slug: "p8-kinetic",
    name: "Kinetic Wall System",
    type: "GFRC Varied-Depth Kinetic Wall Panel",
    finish: "Matte Charcoal",
    description:
      "60x12 custom-width slat wall system with varied-depth protruding kinetic fins. Some fins sit flush; others project up to 2 inches. The composition shifts visually as the viewer moves. Matte charcoal finish emphasizes shadow play.",
    outerLength: 60,
    outerWidth: 12,
    outerHeight: 1.25,
    retailPrice: 2400,
    wholesalePrice: 1320,
    targetWeightMinLbs: 22,
    targetWeightMaxLbs: 28,
  },
  {
    code: "P9-DUNE",
    slug: "p9-dune",
    name: "Dune Wave Panel",
    type: "GFRC Woodform Undulating Wall Panel",
    finish: "Woodform Dune",
    description:
      "48x12 slat wall art panel with rolling horizontal dune-curve relief, cast against wood-grain molds. Warm blonde wood tone with soft undulating surface that plays with raking light. Designed as a sculptural feature wall.",
    outerLength: 48,
    outerWidth: 12,
    outerHeight: 1.0,
    retailPrice: 840,
    wholesalePrice: 460,
    targetWeightMinLbs: 14,
    targetWeightMaxLbs: 18,
  },
];

const DATUM_SYSTEM = [
  { name: "Datum A", description: "Back face of the panel; reference for thickness and relief projection." },
  { name: "Datum B", description: "Centerline in the length direction. Relief pattern aligns to this axis." },
  { name: "Datum C", description: "Centerline in the width direction. Edge profile symmetry reference." },
];

const CALC_DEFAULTS = {
  mixType: "SCC",
  waterLbs: 6,
  scaleFactor: 2.16,
  wasteFactor: 1.08,
  batchSizeLbs: 20,
  fiberPercent: 0.02,
  pigmentGrams: 260,
  unitsToProduce: 4,
  autoBatchSizeLbs: 60,
  plasticizerGrams: 75,
  weightPerUnitLbs: 16,
  overheadCostPerUnit: 14,
  colorIntensityPercent: 0.02,
};

async function main() {
  for (const s of NEW_SKUS) {
    const data = {
      code: s.code,
      slug: s.slug,
      name: s.name,
      category: "PANEL" as const,
      status: "ACTIVE" as const,
      type: s.type,
      finish: s.finish,
      description: s.description,
      retailPrice: new Prisma.Decimal(s.retailPrice),
      wholesalePrice: new Prisma.Decimal(s.wholesalePrice),
      targetWeightMinLbs: new Prisma.Decimal(s.targetWeightMinLbs),
      targetWeightMaxLbs: new Prisma.Decimal(s.targetWeightMaxLbs),
      outerLength: new Prisma.Decimal(s.outerLength),
      outerWidth: new Prisma.Decimal(s.outerWidth),
      outerHeight: new Prisma.Decimal(s.outerHeight),
      innerLength: new Prisma.Decimal(0),
      innerWidth: new Prisma.Decimal(0),
      innerDepth: new Prisma.Decimal(0),
      wallThickness: new Prisma.Decimal(0),
      bottomThickness: new Prisma.Decimal(s.outerHeight),
      topLipThickness: new Prisma.Decimal(0),
      hollowCoreDepth: new Prisma.Decimal(0),
      domeRiseMin: new Prisma.Decimal(0),
      domeRiseMax: new Prisma.Decimal(0),
      longRibCount: 0,
      crossRibCount: 0,
      ribWidth: new Prisma.Decimal(0),
      ribHeight: new Prisma.Decimal(0),
      drainDiameter: new Prisma.Decimal(0),
      draftAngle: new Prisma.Decimal(2),
      cornerRadius: new Prisma.Decimal(0.06),
      fiberPercent: new Prisma.Decimal("0.02"),
      reinforcementDiameter: new Prisma.Decimal(0),
      reinforcementThickness: new Prisma.Decimal(0),
      mountType: "WALL_ADHESIVE",
      hasOverflow: false,
      laborHoursPerUnit: new Prisma.Decimal(0.75),
      datumSystemJson: DATUM_SYSTEM as unknown as Prisma.InputJsonValue,
      calculatorDefaults: CALC_DEFAULTS as unknown as Prisma.InputJsonValue,
    };

    const result = await prisma.sku.upsert({
      where: { code: s.code },
      create: data,
      update: data,
    });
    console.log(`upsert ok: ${result.code} · ${result.name}`);
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("seed failed:", err);
  await prisma.$disconnect();
  process.exit(1);
});
