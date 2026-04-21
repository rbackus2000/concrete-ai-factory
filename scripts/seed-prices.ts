import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Retail prices based on actual GFRC manufacturing costs, size, and market positioning
const PRICES: Record<string, { retail: number; wholesale: number }> = {
  // ── VESSEL SINKS ────────────────────────────────────────────
  "S1-EROSION":   { retail: 1850, wholesale: 1020 },   // 20x14x6 — mid-size, signature texture
  "S2-CANYON":    { retail: 2200, wholesale: 1210 },   // 24x13x6 — large ramp, complex mold
  "S3-TIDE":      { retail: 1450, wholesale: 800 },    // 18x13x6 — compact rectangle
  "S4-FACET":     { retail: 1950, wholesale: 1075 },   // 20x14x6 — diamond-cut facets, precision mold
  "S5-SLOPE":     { retail: 2400, wholesale: 1320 },   // 30x13x6 — longest sink, ramp design
  "S6-TIMBER":    { retail: 2100, wholesale: 1155 },   // 24x14x6 — wood-grain texture, large
  "S7-ROUND":     { retail: 1250, wholesale: 690 },    // 16x16x5.5 — simple round bowl
  "S8-OVAL":      { retail: 1450, wholesale: 800 },    // 20x14x5.5 — oval bowl, mid-size
  "S9-RIDGE":     { retail: 1350, wholesale: 745 },    // 16x16x5.5 — ridge texture round
  "S10-CHANNEL":  { retail: 1550, wholesale: 855 },    // 18x14x5 — channel drain design
  "S11-RIVER":    { retail: 1950, wholesale: 1075 },   // 22x14x6 — river canyon texture
  "S12-STRATA":   { retail: 2800, wholesale: 1540 },   // 24x20x6 — largest sink, layered strata
  "S13-SPHERE":   { retail: 1350, wholesale: 745 },    // 16x16x6 — sphere bowl

  // ── FURNITURE ───────────────────────────────────────────────
  "F1-MONOLITH":  { retail: 1400, wholesale: 770 },    // 14x14x20 — small side table
  "F2-SLAB":      { retail: 3200, wholesale: 1760 },   // 48x24x2 — large coffee table slab
  "F3-ARCADE":    { retail: 4800, wholesale: 2640 },   // 60x18x18 — outdoor bench, heaviest piece
  "F4-LEDGE":     { retail: 3800, wholesale: 2090 },   // 48x12x32 — tall console table
  "F5-BASIN":     { retail: 2200, wholesale: 1210 },   // 36x14x14 — planter
  "F6-STUMP":     { retail: 1600, wholesale: 880 },    // 16x16x18 — small side table
  "F7-FISSURE":   { retail: 4200, wholesale: 2310 },   // 48x14x32 — console with fissure detail

  // ── PANELS ──────────────────────────────────────────────────
  "P1-RIDGE":     { retail: 145, wholesale: 80 },      // 12x12x0.75 — small tile
  "P2-DUNE":      { retail: 245, wholesale: 135 },     // 24x12x1 — medium panel
  "P3-FLUTE":     { retail: 245, wholesale: 135 },     // 12x24x1 — medium panel, fluted
  "P4-BRICK":     { retail: 85, wholesale: 47 },       // 8x3x0.5 — small brick veneer
  "P5-ASHLAR":    { retail: 165, wholesale: 91 },      // 16x8x1.25 — ashlar block

  // ── WALL TILES ──────────────────────────────────────────────
  "T1-SLATE":     { retail: 195, wholesale: 108 },     // 12x24x0.63 — large format slate
  "T2-RIDGE":     { retail: 65, wholesale: 36 },       // 8x8x0.75 — small tile
  "T3-CHANNEL":   { retail: 95, wholesale: 53 },       // 6x18x0.75 — narrow channel tile
  "T4-MONOLITH":  { retail: 320, wholesale: 176 },     // 16x32x0.63 — largest tile format
  "T5-TECTONIC":  { retail: 385, wholesale: 212 },     // 24x21x2.5 — hex tile, thickest
};

async function main() {
  console.log("Seeding SKU retail/wholesale prices...\n");

  for (const [code, prices] of Object.entries(PRICES)) {
    const result = await prisma.sku.updateMany({
      where: { code },
      data: {
        retailPrice: prices.retail,
        wholesalePrice: prices.wholesale,
      },
    });

    if (result.count > 0) {
      console.log(
        `  ${code.padEnd(14)} retail: $${prices.retail.toLocaleString().padStart(6)}   wholesale: $${prices.wholesale.toLocaleString().padStart(6)}`,
      );
    } else {
      console.log(`  ${code.padEnd(14)} ⚠ NOT FOUND`);
    }
  }

  console.log("\nDone. All SKU prices updated.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
