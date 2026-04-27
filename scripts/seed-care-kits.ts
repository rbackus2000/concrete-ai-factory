/**
 * Seed care kit fulfillment data.
 *
 *  - 5 individual care SKUs (RBS-CARE-001..005) into Sku table
 *  - 4 bundled kit SKUs (RBS-CARE-KIT-S/F/W/REPAIR) into Sku table
 *  - 1 free in-box starter SKU (RBS-CARE-FREE) into Sku table
 *  - Care kit components catalog (CareKitComponent)
 *  - Build sheets per kit (CareKitBuildSheet + items)
 *
 * SKU codes match the storefront (backus-design-co) exactly so customer orders
 * flow into fulfillment build sheets without translation.
 *
 * Usage: npx tsx scripts/seed-care-kits.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ── SKU rows ──
// Note: care SKUs reuse the existing Sku model. Geometry fields stay null —
// these aren't manufactured, they're assembled. We use `type`/`finish` for
// labelling only, plus retailPrice for margin math on build sheets.
const CARE_SKUS = [
  // Individual items
  { code: "RBS-CARE-001",        slug: "rbs-care-001-cleaner",       name: "Concrete Surface Cleaner",        retailPrice: 18, type: "CONSUMABLE", finish: "N/A" },
  { code: "RBS-CARE-002",        slug: "rbs-care-002-wax",           name: "Concrete Maintenance Wax",        retailPrice: 28, type: "CONSUMABLE", finish: "N/A" },
  { code: "RBS-CARE-003",        slug: "rbs-care-003-resealer",      name: "Concrete Surface Resealer",       retailPrice: 48, type: "CONSUMABLE", finish: "N/A" },
  { code: "RBS-CARE-004",        slug: "rbs-care-004-chip-compound", name: "Concrete Chip Repair Compound",   retailPrice: 35, type: "CONSUMABLE", finish: "Color-matched" },
  { code: "RBS-CARE-005",        slug: "rbs-care-005-applicators",   name: "Concrete Care Applicator Set",    retailPrice: 22, type: "TOOLSET",    finish: "N/A" },
  // Bundled kits
  { code: "RBS-CARE-KIT-S",      slug: "rbs-care-kit-sink",          name: "Sink Care Kit",                   retailPrice: 95, type: "BUNDLE", finish: "N/A" },
  { code: "RBS-CARE-KIT-F",      slug: "rbs-care-kit-furniture",     name: "Furniture & Hard Goods Care Kit", retailPrice: 115, type: "BUNDLE", finish: "N/A" },
  { code: "RBS-CARE-KIT-W",      slug: "rbs-care-kit-wall-tile",     name: "Wall Tile Care Kit",              retailPrice: 85, type: "BUNDLE", finish: "N/A" },
  { code: "RBS-CARE-KIT-REPAIR", slug: "rbs-care-kit-repair",        name: "Chip & Edge Repair Kit",          retailPrice: 55, type: "BUNDLE", finish: "Color-matched" },
  // Free in-box starter (ships free with every order)
  { code: "RBS-CARE-FREE",       slug: "rbs-care-free-starter",      name: "In-Box Care Starter (free)",      retailPrice: 0,  type: "BUNDLE", finish: "N/A" },
] as const;

// ── Components catalog ──
const COMPONENTS = [
  {
    componentKey: "cleaner-bottle",
    name: "pH-Neutral Concrete Surface Cleaner",
    description: "16 oz spray bottle. Private label or bulk repackage.",
    supplierName: "Kodiak Pro or local janitorial supply",
    supplierUrl: "https://www.kodiakpro.com/",
    unitCost: 6.5,
    size: "16 oz bottle",
    reorderQty: 24,
    leadTimeDays: 5,
    storageNotes: "Store upright. Shelf life 2 years.",
    labelRequired: true,
    assemblyNotes: "Apply RB Studio label over supplier label.",
  },
  {
    componentKey: "beeswax-tin-2oz",
    name: "Food-Safe Beeswax/Carnauba Wax Blend — 2 oz Tin",
    description: "Small format. Included in free in-box starter kit.",
    supplierName: "Buddy Rhodes",
    supplierUrl: "https://www.buddyrhodes.com/food-grade-beeswax",
    unitCost: 4.25,
    size: "2 oz tin",
    reorderQty: 50,
    leadTimeDays: 7,
    storageNotes: "Store at room temperature. Do not freeze.",
    labelRequired: false,
    assemblyNotes: "Ships as-is with care card.",
  },
  {
    componentKey: "beeswax-tin-6oz",
    name: "Food-Safe Beeswax/Carnauba Wax Blend — 6 oz Tin",
    description: "Full size. Sold individually and included in all bundled kits.",
    supplierName: "Buddy Rhodes",
    supplierUrl: "https://www.buddyrhodes.com/food-grade-beeswax",
    unitCost: 10.5,
    size: "6 oz tin",
    reorderQty: 30,
    leadTimeDays: 7,
    storageNotes: "Store at room temperature. Do not freeze.",
    labelRequired: false,
    assemblyNotes: "Ships as-is.",
  },
  {
    componentKey: "resealer-4oz",
    name: "Reactive Penetrating Resealer — 4 oz Bottle",
    description: "ICT Protect + MatteMax pre-mixed at 4:1 ratio. Matte finish.",
    supplierName: "Kodiak Pro",
    supplierUrl: "https://www.kodiakpro.com/products/ict-sealer-1",
    unitCost: 18,
    size: "4 oz bottle (~20 sq ft coverage)",
    reorderQty: 20,
    leadTimeDays: 7,
    storageNotes: "Store 50-80°F. Shelf life 1 year unopened.",
    labelRequired: true,
    assemblyNotes: "Pre-mix ICT Protect + MatteMax at 4:1 ratio. Bottle and apply RB Studio label.",
    mixRatio: "4 parts ICT Protect : 1 part MatteMax",
  },
  {
    componentKey: "resealer-8oz",
    name: "Reactive Penetrating Resealer — 8 oz Bottle",
    description: "Double format for furniture kit. Same 4:1 mix ratio.",
    supplierName: "Kodiak Pro",
    supplierUrl: "https://www.kodiakpro.com/products/ict-sealer-1",
    unitCost: 32,
    size: "8 oz bottle (~40 sq ft coverage)",
    reorderQty: 10,
    leadTimeDays: 7,
    storageNotes: "Store 50-80°F. Shelf life 1 year unopened.",
    labelRequired: true,
    assemblyNotes: "Pre-mix ICT Protect + MatteMax at 4:1 ratio. Bottle and label.",
    mixRatio: "4 parts ICT Protect : 1 part MatteMax",
  },
  {
    componentKey: "chip-compound-2oz",
    name: "Color-Matched GFRC Repair Compound — 2 oz",
    description: "Made to order per color. Mixed from Maker Mix + Kodiak Pro pigments.",
    supplierName: "Internal — Kodiak Pro Maker Mix + pigments",
    supplierUrl: "https://www.kodiakpro.com/",
    unitCost: 8.5,
    size: "2 oz container",
    reorderQty: null,
    leadTimeDays: 3,
    storageNotes: "Color-specific. Made to order. Label with color name, batch date, expiry date.",
    labelRequired: true,
    assemblyNotes: "Mix Maker Mix + correct pigment to match order color. Test on scrap GFRC before bottling. Shelf life 90 days.",
    madeToOrder: true,
  },
  {
    componentKey: "microfiber-cloth",
    name: "Lint-Free Microfiber Applicator Cloth — 6x6\"",
    description: "White lint-free microfiber for wax and sealer application.",
    supplierName: "Amazon or local janitorial supply — bulk",
    supplierUrl: "https://www.amazon.com/s?k=microfiber+applicator+cloths+bulk",
    unitCost: 0.65,
    size: "6x6 inch cloth",
    reorderQty: 200,
    leadTimeDays: 3,
    storageNotes: "Store in sealed bag to keep clean.",
    labelRequired: false,
    assemblyNotes: "Fold and bundle 2 per kit.",
  },
  {
    componentKey: "buffing-cloth",
    name: "High-Pile Microfiber Buffing Cloth — 8x8\"",
    description: "For final buff after wax application.",
    supplierName: "Amazon or local janitorial supply — bulk",
    supplierUrl: "https://www.amazon.com/s?k=microfiber+buffing+cloth+bulk",
    unitCost: 0.85,
    size: "8x8 inch cloth",
    reorderQty: 200,
    leadTimeDays: 3,
    storageNotes: "Store in sealed bag.",
    labelRequired: false,
    assemblyNotes: "1 per kit.",
  },
  {
    componentKey: "sheepskin-pad",
    name: "Sheepskin Buffing Pad — 4 inch",
    description: "For wax buffing on larger furniture surfaces. Furniture kit only.",
    supplierName: "Amazon or auto supply — bulk",
    supplierUrl: "https://www.amazon.com/s?k=sheepskin+buffing+pad+4+inch",
    unitCost: 2.2,
    size: "4 inch pad",
    reorderQty: 50,
    leadTimeDays: 5,
    labelRequired: false,
    assemblyNotes: "1 per furniture kit only — not in sink or tile kit.",
  },
  {
    componentKey: "foam-applicator",
    name: "Fine Foam Applicator Pad — 3 inch",
    description: "For resealer application. Tile kit gets 2x.",
    supplierName: "Amazon or auto supply — bulk",
    supplierUrl: "https://www.amazon.com/s?k=foam+applicator+pad+small+bulk",
    unitCost: 0.55,
    size: "3 inch foam pad",
    reorderQty: 100,
    leadTimeDays: 3,
    labelRequired: false,
    assemblyNotes: "1 per sink/furniture kit. 2 per tile kit (texture work requires extra).",
  },
  {
    componentKey: "nitrile-gloves-pair",
    name: "Nitrile Gloves — 1 Pair (M/L)",
    description: "For sealer and repair compound application.",
    supplierName: "Amazon or local safety supply — bulk box",
    supplierUrl: "https://www.amazon.com/s?k=nitrile+gloves+bulk+box",
    unitCost: 0.35,
    size: "1 pair M/L",
    reorderQty: 200,
    leadTimeDays: 3,
    labelRequired: false,
    assemblyNotes: "2 pairs per sink/furniture kit. 1 pair per tile/repair kit.",
  },
  {
    componentKey: "sanding-sponge-220",
    name: "220-Grit Fine Sanding Sponge",
    description: "For surface prep before resealing.",
    supplierName: "Home Depot or Amazon — bulk",
    supplierUrl: "https://www.amazon.com/s?k=220+grit+sanding+sponge+bulk",
    unitCost: 0.9,
    size: "Single sponge",
    reorderQty: 100,
    leadTimeDays: 3,
    labelRequired: false,
    assemblyNotes: "1 per kit.",
  },
  {
    componentKey: "sanding-sheet-400",
    name: "400-Grit Wet/Dry Sandpaper — 2 Quarter Sheets",
    description: "For chip repair blending. Repair kit only.",
    supplierName: "Home Depot or Amazon — bulk",
    supplierUrl: "https://www.amazon.com/s?k=400+grit+wet+dry+sandpaper",
    unitCost: 0.6,
    size: "2 quarter-sheets",
    reorderQty: 200,
    leadTimeDays: 3,
    labelRequired: false,
    assemblyNotes: "Pre-cut full sheets into quarters. 2 per repair kit.",
  },
  {
    componentKey: "spatula-mini",
    name: "Mini Stainless Spatula / Spreader — 4 inch",
    description: "For chip compound application and feathering. Repair kit only.",
    supplierName: "Amazon — bulk",
    supplierUrl: "https://www.amazon.com/s?k=mini+stainless+spatula+craft",
    unitCost: 1.2,
    size: "4 inch stainless",
    reorderQty: 50,
    leadTimeDays: 5,
    labelRequired: false,
    assemblyNotes: "1 per repair kit.",
  },
  {
    componentKey: "care-card",
    name: "RB Studio Care Card — Printed",
    description: "Double-sided printed card. Front: care summary. Back: QR code to care video + reorder link.",
    supplierName: "Moo.com or local print shop",
    supplierUrl: "https://www.moo.com/us/business-cards/",
    unitCost: 0.45,
    size: "4x6 inch, 16pt matte stock",
    reorderQty: 250,
    leadTimeDays: 10,
    storageNotes: "Store flat, keep dry.",
    labelRequired: false,
    assemblyNotes: "Include in every box — product kit AND care kit. Care card faces up, first thing customer sees.",
  },
  {
    componentKey: "rb-studio-bag",
    name: "RB Studio Matte Black Kit Pouch",
    description: "Matte black resealable kraft pouch with RB Studio logo. For bundled kit packaging.",
    supplierName: "Packlane or noissue",
    supplierUrl: "https://www.packlane.com/",
    unitCost: 1.8,
    size: "6x9 inch matte black pouch",
    reorderQty: 100,
    leadTimeDays: 14,
    storageNotes: "Store flat.",
    labelRequired: false,
    assemblyNotes: "For all bundled kit SKUs. Add tissue paper before sealing.",
  },
  {
    componentKey: "tissue-paper",
    name: "Black Tissue Paper",
    description: "Wrapping inside kit pouch.",
    supplierName: "Amazon or local packaging supplier",
    supplierUrl: "https://www.amazon.com/s?k=black+tissue+paper+bulk",
    unitCost: 0.15,
    size: "2 sheets per kit",
    reorderQty: 500,
    leadTimeDays: 3,
    labelRequired: false,
    assemblyNotes: "2 sheets per bundled kit.",
  },
] as const;

// ── Build sheets ──
const BUILD_SHEETS = [
  {
    skuCode: "RBS-CARE-KIT-S",
    assemblyTimeMinutes: 8,
    colorRequired: false,
    assemblyNotes: [
      "1. Pre-mix resealer batch weekly — label and date each bottle",
      "2. Apply RB Studio label to cleaner bottle",
      "3. Layer tissue in bag: beeswax + resealer first, cleaner + cloths on top",
      "4. Tuck care card face-up so it is first thing customer sees",
      "5. Fold and seal bag — do not over-stuff",
    ],
    items: [
      { componentKey: "cleaner-bottle",       qty: 1, notes: "Apply RB Studio label" },
      { componentKey: "beeswax-tin-6oz",      qty: 1, notes: "" },
      { componentKey: "resealer-4oz",         qty: 1, notes: "Pre-mix + label" },
      { componentKey: "microfiber-cloth",     qty: 2, notes: "Fold together" },
      { componentKey: "buffing-cloth",        qty: 1, notes: "" },
      { componentKey: "foam-applicator",      qty: 1, notes: "" },
      { componentKey: "nitrile-gloves-pair",  qty: 2, notes: "" },
      { componentKey: "sanding-sponge-220",   qty: 1, notes: "" },
      { componentKey: "care-card",            qty: 1, notes: "" },
      { componentKey: "rb-studio-bag",        qty: 1, notes: "" },
      { componentKey: "tissue-paper",         qty: 2, notes: "" },
    ],
  },
  {
    skuCode: "RBS-CARE-KIT-F",
    assemblyTimeMinutes: 10,
    colorRequired: false,
    assemblyNotes: [
      "1. Furniture kit uses 8 oz resealer (double batch) — pre-mix weekly",
      "2. Include sheepskin pad — NOT in sink kit",
      "3. Use larger 8x11 bag if available — furniture kit is bulkier",
      "4. Layer heaviest items (resealer, cleaner) at bottom of bag",
    ],
    items: [
      { componentKey: "cleaner-bottle",       qty: 1, notes: "Apply RB Studio label" },
      { componentKey: "beeswax-tin-6oz",      qty: 1, notes: "" },
      { componentKey: "resealer-8oz",         qty: 1, notes: "Pre-mix + label (double size)" },
      { componentKey: "microfiber-cloth",     qty: 2, notes: "" },
      { componentKey: "buffing-cloth",        qty: 1, notes: "" },
      { componentKey: "sheepskin-pad",        qty: 1, notes: "Furniture kit only" },
      { componentKey: "foam-applicator",      qty: 1, notes: "" },
      { componentKey: "nitrile-gloves-pair",  qty: 2, notes: "" },
      { componentKey: "sanding-sponge-220",   qty: 1, notes: "" },
      { componentKey: "care-card",            qty: 1, notes: "" },
      { componentKey: "rb-studio-bag",        qty: 1, notes: "Use larger 8x11 bag if available" },
      { componentKey: "tissue-paper",         qty: 2, notes: "" },
    ],
  },
  {
    skuCode: "RBS-CARE-KIT-W",
    assemblyTimeMinutes: 7,
    colorRequired: false,
    assemblyNotes: [
      "1. Tile kit gets 2x foam applicators — required for Channel/Ridge texture grooves",
      "2. No sheepskin pad in tile kit",
      "3. No buffing cloth in tile kit — microfiber cloth serves both purposes",
    ],
    items: [
      { componentKey: "cleaner-bottle",       qty: 1, notes: "Apply RB Studio label" },
      { componentKey: "beeswax-tin-6oz",      qty: 1, notes: "" },
      { componentKey: "resealer-4oz",         qty: 1, notes: "Pre-mix + label" },
      { componentKey: "microfiber-cloth",     qty: 2, notes: "" },
      { componentKey: "foam-applicator",      qty: 2, notes: "Extra for texture work on Channel/Ridge tile" },
      { componentKey: "nitrile-gloves-pair",  qty: 1, notes: "" },
      { componentKey: "sanding-sponge-220",   qty: 1, notes: "" },
      { componentKey: "care-card",            qty: 1, notes: "" },
      { componentKey: "rb-studio-bag",        qty: 1, notes: "" },
      { componentKey: "tissue-paper",         qty: 2, notes: "" },
    ],
  },
  {
    skuCode: "RBS-CARE-KIT-REPAIR",
    assemblyTimeMinutes: 12,
    colorRequired: true,
    assemblyNotes: [
      "⚠️  COLOR-SPECIFIC — always confirm order color before mixing compound",
      "1. Mix chip compound fresh per order — 90 day shelf life only",
      "2. Label compound with: color name, batch date, expiry date",
      "3. Test color match on scrap GFRC sample before bottling",
      "4. Fill resealer bottle to 2 oz only (half-fill 4oz bottle)",
    ],
    items: [
      { componentKey: "chip-compound-2oz",    qty: 1,   notes: "⚠️ COLOR SPECIFIC — check order before mixing" },
      { componentKey: "resealer-4oz",         qty: 0.5, notes: "Fill to 2 oz only — touch-up sample" },
      { componentKey: "spatula-mini",         qty: 1,   notes: "" },
      { componentKey: "sanding-sheet-400",    qty: 2,   notes: "Pre-cut quarter sheets" },
      { componentKey: "microfiber-cloth",     qty: 1,   notes: "" },
      { componentKey: "nitrile-gloves-pair",  qty: 1,   notes: "" },
      { componentKey: "care-card",            qty: 1,   notes: "" },
      { componentKey: "rb-studio-bag",        qty: 1,   notes: "Smaller 5x7 bag OK for repair kit" },
    ],
  },
  {
    skuCode: "RBS-CARE-FREE",
    assemblyTimeMinutes: 2,
    colorRequired: false,
    assemblyNotes: [
      "1. Bundle wax tin + cloth + care card — rubber band or small envelope",
      "2. Place on top of product inside shipping box before sealing",
      "3. Care card faces up — first thing customer sees when opening",
    ],
    items: [
      { componentKey: "beeswax-tin-2oz",  qty: 1, notes: "Small format starter" },
      { componentKey: "microfiber-cloth", qty: 1, notes: "" },
      { componentKey: "care-card",        qty: 1, notes: "QR to care video + reorder" },
    ],
  },
] as const;

async function main() {
  console.log("Seeding care kit data...");

  // 1. SKUs
  for (const sku of CARE_SKUS) {
    await prisma.sku.upsert({
      where: { code: sku.code },
      update: { name: sku.name, retailPrice: sku.retailPrice, status: "ACTIVE" },
      create: {
        code: sku.code,
        slug: sku.slug,
        name: sku.name,
        category: "CARE_KIT",
        type: sku.type,
        finish: sku.finish,
        retailPrice: sku.retailPrice,
        status: "ACTIVE",
      },
    });
  }
  console.log(`  ✓ ${CARE_SKUS.length} care SKUs upserted`);

  // 2. Components
  for (const component of COMPONENTS) {
    await prisma.careKitComponent.upsert({
      where: { componentKey: component.componentKey },
      update: { ...component, status: "ACTIVE" },
      create: { ...component, status: "ACTIVE" },
    });
  }
  console.log(`  ✓ ${COMPONENTS.length} components upserted`);

  // 3. Build sheets
  const componentByKey = new Map(
    (await prisma.careKitComponent.findMany({ select: { id: true, componentKey: true } })).map((c) => [
      c.componentKey,
      c.id,
    ]),
  );

  for (const sheet of BUILD_SHEETS) {
    const existing = await prisma.careKitBuildSheet.findUnique({ where: { skuCode: sheet.skuCode } });
    if (existing) {
      // Wipe and replace items so updates to qty/notes apply cleanly.
      await prisma.careKitBuildSheetItem.deleteMany({ where: { buildSheetId: existing.id } });
      await prisma.careKitBuildSheet.update({
        where: { id: existing.id },
        data: {
          assemblyTimeMinutes: sheet.assemblyTimeMinutes,
          assemblyNotes: sheet.assemblyNotes as unknown as object,
          colorRequired: sheet.colorRequired,
          status: "ACTIVE",
          items: {
            create: sheet.items.map((item) => ({
              componentId: componentByKey.get(item.componentKey)!,
              qty: item.qty,
              notes: item.notes || null,
            })),
          },
        },
      });
    } else {
      await prisma.careKitBuildSheet.create({
        data: {
          skuCode: sheet.skuCode,
          assemblyTimeMinutes: sheet.assemblyTimeMinutes,
          assemblyNotes: sheet.assemblyNotes as unknown as object,
          colorRequired: sheet.colorRequired,
          status: "ACTIVE",
          items: {
            create: sheet.items.map((item) => ({
              componentId: componentByKey.get(item.componentKey)!,
              qty: item.qty,
              notes: item.notes || null,
            })),
          },
        },
      });
    }
  }
  console.log(`  ✓ ${BUILD_SHEETS.length} build sheets upserted`);

  console.log("Done.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
