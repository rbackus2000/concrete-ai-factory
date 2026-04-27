import { spawnSync } from "node:child_process";
import path from "node:path";

import { ensurePdfRuntimeAvailable } from "./pdf-runtime-service";

export type LabelShape = "rect" | "round";
export type LabelMode = "sheet" | "single";
export type LabelSide = "front" | "back";

export type LabelSpec = {
  sku: string;
  name: string;
  tagline: string;
  size: string;
  shape: LabelShape;
  instructions: string[];
  ingredients?: string;
  // Storefront slug, used to build the QR URL.
  slug: string;
};

const STOREFRONT_BASE = "https://backusdesignco.com/shop/care-kits/";

export function qrUrlFor(spec: LabelSpec): string {
  return `${STOREFRONT_BASE}${spec.slug}`;
}

// Hardcoded for now; matches RBS-CARE-001..004 + the kit hangtags. The
// applicator set has no individual container, so no label entry.
export const CARE_LABEL_SPECS: LabelSpec[] = [
  {
    sku: "RBS-CARE-001",
    name: "Concrete Surface Cleaner",
    tagline: "pH-neutral. Safe for sealed concrete.",
    size: "16 FL OZ",
    shape: "rect",
    slug: "rb-studio-concrete-cleaner",
    instructions: [
      "Spray onto the concrete surface from 6-8 inches away.",
      "Wipe in a circular motion with a clean microfiber cloth.",
      "Rinse with clean water; dry thoroughly.",
      "Avoid bleach, ammonia, acetone, or abrasive scrubbers.",
    ],
    ingredients: "Plant-derived surfactants, distilled water, citrate buffer, food-grade preservative. pH 6.8-7.2. Biodegradable.",
  },
  {
    sku: "RBS-CARE-002",
    name: "Maintenance Wax",
    tagline: "Food-safe. Matte finish. Monthly protection.",
    size: "6 OZ",
    shape: "round",
    slug: "rb-studio-maintenance-wax",
    instructions: [
      "Apply a thin coat with a soft applicator cloth.",
      "Allow to haze for 2-3 minutes.",
      "Buff to a soft matte finish with a clean microfiber cloth.",
      "Reapply monthly on sinks; every 4-6 weeks for outdoor furniture.",
    ],
    ingredients: "Food-safe beeswax, carnauba wax, food-grade mineral oil. Made in small batches.",
  },
  {
    sku: "RBS-CARE-003",
    name: "Surface Resealer",
    tagline: "Restore. Protect. Revive.",
    size: "4 FL OZ",
    shape: "rect",
    slug: "rb-studio-surface-resealer",
    instructions: [
      "Clean the surface and let dry completely (24-48 hours).",
      "Lightly sand with a 220-grit sponge to open the pores.",
      "Apply a thin, even coat with a foam applicator pad.",
      "Allow to cure 24 hours before returning to use.",
      "Coverage: ~20 sq ft.",
    ],
    ingredients: "Reactive silane / siloxane penetrating sealer with matte additive. VOC compliant. Wear gloves.",
  },
  {
    sku: "RBS-CARE-004",
    name: "Chip Repair Compound",
    tagline: "Color-matched. Invisible repair.",
    size: "2 OZ",
    shape: "round",
    slug: "rb-studio-chip-repair",
    instructions: [
      "Press a small amount into the chip with the included spatula.",
      "Feather the edges to blend with the surrounding surface.",
      "Allow to cure 24 hours.",
      "Lightly sand with 400-grit wet/dry paper.",
      "Reseal the repaired area with surface resealer.",
    ],
    ingredients: "Color-matched GFRC blend: portland cement, fine silica, polymer, glass fiber, oxide pigments. Made to order — 90 day shelf life.",
  },
  {
    sku: "RBS-CARE-KIT-S",
    name: "Sink Care Kit",
    tagline: "Everything your sink needs.",
    size: "KIT POUCH",
    shape: "rect",
    slug: "rb-studio-sink-care-kit",
    instructions: [
      "Daily: clean with surface cleaner and microfiber cloth.",
      "Monthly: apply maintenance wax with applicator and buff.",
      "Every 3-5 years: reseal with surface resealer.",
      "Read each component's individual label for full directions.",
    ],
  },
  {
    sku: "RBS-CARE-KIT-F",
    name: "Furniture & Hard Goods Kit",
    tagline: "For tables, benches, and beyond.",
    size: "KIT POUCH",
    shape: "rect",
    slug: "rb-studio-furniture-care-kit",
    instructions: [
      "Daily: wipe with damp cloth; spot clean with surface cleaner.",
      "Monthly: apply wax with sheepskin pad and buff.",
      "Annually (outdoor): reseal with surface resealer.",
      "Read each component's individual label for full directions.",
    ],
  },
  {
    sku: "RBS-CARE-KIT-W",
    name: "Wall Tile Care Kit",
    tagline: "Protect the surface. Preserve the texture.",
    size: "KIT POUCH",
    shape: "rect",
    slug: "rb-studio-wall-tile-care-kit",
    instructions: [
      "Wipe tile face with damp cloth or soft brush.",
      "Use foam applicator on Channel/Ridge textures to reach grooves.",
      "Reseal every 2-3 years for bathroom installs; 5+ years for dry walls.",
      "Read each component's individual label for full directions.",
    ],
  },
  {
    sku: "RBS-CARE-KIT-REPAIR",
    name: "Chip & Edge Repair Kit",
    tagline: "Invisible repair. Any color.",
    size: "KIT POUCH",
    shape: "rect",
    slug: "rb-studio-chip-repair-kit",
    instructions: [
      "Confirm the studio color stamped inside the lid.",
      "Apply repair compound and feather; cure 24 hours.",
      "Sand smooth with 400-grit; reseal the repaired zone.",
      "Read each component's individual label for full directions.",
    ],
  },
];

export function getCareLabelBySku(sku: string): LabelSpec | undefined {
  return CARE_LABEL_SPECS.find((l) => l.sku === sku);
}

export function renderCareLabelsPdf(
  specs: LabelSpec[],
  mode: LabelMode = "single",
  side: LabelSide = "front",
): Buffer {
  ensurePdfRuntimeAvailable();
  const scriptPath = path.join(process.cwd(), "scripts", "render_care_labels.py");
  // Project the storefront QR URL onto each spec for the back-label render.
  const labels = specs.map((spec) => ({
    sku: spec.sku,
    name: spec.name,
    tagline: spec.tagline,
    size: spec.size,
    shape: spec.shape,
    instructions: spec.instructions,
    ingredients: spec.ingredients ?? "",
    qr_url: qrUrlFor(spec),
  }));
  const payload = JSON.stringify({ mode, side, labels });
  const result = spawnSync("python3", [scriptPath], {
    input: payload,
    maxBuffer: 10 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(`Care label PDF render failed: ${result.stderr?.toString() || "unknown error"}`);
  }
  return result.stdout;
}
