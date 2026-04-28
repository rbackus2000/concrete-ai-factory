import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { OutputStatus, OutputType, RecordStatus } from "@prisma/client";

import { prisma } from "@/lib/db";
import { ensurePdfRuntimeAvailable } from "@/lib/services/pdf-runtime-service";

// ── Trade Spec Sheet ──
// Single-page architect tear sheet generated on-demand from the SKU
// record. No stored output — rebuilds every call so the latest pricing
// and dimensions are always reflected.

// Lead-time copy by category. Hardcoded here because we don't yet have
// a leadTimeWeeks field on the Sku model. When that column lands, swap
// this map for the live value.
const LEAD_TIME_BY_CATEGORY: Record<string, string> = {
  VESSEL_SINK: "10–12 weeks made-to-order",
  COUNTERTOP: "10–14 weeks made-to-order",
  FURNITURE: "8–10 weeks made-to-order",
  PANEL: "8–10 weeks made-to-order",
  TILE: "4–6 weeks made-to-order",
  HARD_GOOD: "Ships within 5 business days",
  CARE_KIT: "Ships within 3 business days",
};

const CATEGORY_LABEL: Record<string, string> = {
  VESSEL_SINK: "Vessel Sink",
  COUNTERTOP: "Countertop",
  FURNITURE: "Furniture",
  PANEL: "Slat Wall",
  TILE: "Tile",
  HARD_GOOD: "Hard Good",
  CARE_KIT: "Care Kit",
};

// Color palettes — match the BDC website's colorVariants. Sinks default
// to Classic; Woodform-named SKUs use the Woodform palette.
const CLASSIC_COLORS = [
  "Linen",
  "Frost",
  "Beach",
  "Graphite",
  "Pewter",
  "Storm",
  "Shadow",
  "Carbon",
];
const WOODFORM_COLORS = [
  "Mist",
  "Dune",
  "Fog",
  "Forest",
  "Grove",
  "Twilight",
  "Mocha",
  "Ember",
];

function pickColorPalette(skuName: string, finish: string): { family: string; colors: string[] } {
  const haystack = `${skuName} ${finish}`.toLowerCase();
  if (haystack.includes("woodform") || haystack.includes("timber")) {
    return { family: "Woodform", colors: WOODFORM_COLORS };
  }
  return { family: "Classic", colors: CLASSIC_COLORS };
}

function pickProductPath(category: string, slug: string): string {
  switch (category) {
    case "VESSEL_SINK":
      return `/sinks/${slug}`;
    case "FURNITURE":
      return `/furniture/${slug}`;
    case "PANEL":
      return `/slat-wall-art/${slug}`;
    case "TILE":
      return `/tile/${slug}`;
    case "HARD_GOOD":
      return `/hard-goods/${slug}`;
    case "CARE_KIT":
      return `/shop/care-kits`;
    default:
      return "/";
  }
}

function decimal(n: unknown): number | null {
  if (n === null || n === undefined) return null;
  const v = typeof n === "string" ? parseFloat(n) : Number(n);
  return Number.isFinite(v) ? v : null;
}

async function findHeroImageUrl(skuId: string): Promise<string | null> {
  const asset = await prisma.generatedImageAsset.findFirst({
    where: {
      status: OutputStatus.GENERATED,
      generatedOutput: {
        skuId,
        outputType: OutputType.IMAGE_RENDER,
        status: { in: [OutputStatus.GENERATED, OutputStatus.APPROVED] },
      },
      OR: [{ imageUrl: { not: null } }, { filePath: { not: null } }],
    },
    orderBy: { createdAt: "desc" },
    select: { imageUrl: true, filePath: true },
  });
  if (!asset) return null;
  return asset.imageUrl ?? asset.filePath ?? null;
}

async function downloadToTempFile(
  url: string,
  destDir: string,
): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    // Keep the file extension stable for reportlab — derive from URL or default to png.
    const extMatch = url.match(/\.(png|jpe?g|webp)(\?.*)?$/i);
    const ext = extMatch ? extMatch[1].toLowerCase().replace("jpeg", "jpg") : "png";
    const filePath = path.join(destDir, `hero.${ext}`);
    writeFileSync(filePath, buf);
    return filePath;
  } catch {
    return null;
  }
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export type TradeSpecSheetResult = {
  filename: string;
  content: Buffer;
};

export async function renderTradeSpecSheet(input: {
  skuCode: string;
  tradeDiscountPct: number;
}): Promise<TradeSpecSheetResult | null> {
  const sku = await prisma.sku.findUnique({
    where: { code: input.skuCode },
    select: {
      id: true,
      code: true,
      slug: true,
      name: true,
      category: true,
      finish: true,
      status: true,
      retailPrice: true,
      outerLength: true,
      outerWidth: true,
      outerHeight: true,
      innerLength: true,
      innerWidth: true,
      innerDepth: true,
      targetWeightMinLbs: true,
      targetWeightMaxLbs: true,
      description: true,
    },
  });
  if (!sku || sku.status !== RecordStatus.ACTIVE) return null;

  const retail = decimal(sku.retailPrice);
  const trade =
    retail !== null
      ? Math.round(retail * (1 - input.tradeDiscountPct / 100) * 100) / 100
      : null;

  const palette = pickColorPalette(sku.name, sku.finish);
  const leadTime = LEAD_TIME_BY_CATEGORY[sku.category] ?? "Lead time available on request";
  const categoryLabel = CATEGORY_LABEL[sku.category] ?? sku.category;
  const productUrl = `https://backusdesignco.com${pickProductPath(sku.category, sku.slug)}`;

  // Hero image (best effort)
  const tempDir = mkdtempSync(path.join(tmpdir(), "spec-sheet-"));
  let heroPath: string | null = null;
  try {
    const heroUrl = await findHeroImageUrl(sku.id);
    if (heroUrl) {
      heroPath = await downloadToTempFile(heroUrl, tempDir);
    }

    const today = new Date();
    const validThrough = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    const payload = {
      code: sku.code,
      name: sku.name,
      category: sku.category,
      categoryLabel,
      finish: sku.finish,
      subtitle: sku.finish ? `${categoryLabel} · ${sku.finish}` : categoryLabel,
      heroImagePath: heroPath,
      dimensions: {
        outer: {
          length: decimal(sku.outerLength),
          width: decimal(sku.outerWidth),
          height: decimal(sku.outerHeight),
        },
        inner:
          sku.innerLength !== null
            ? {
                length: decimal(sku.innerLength),
                width: decimal(sku.innerWidth),
                depth: decimal(sku.innerDepth),
              }
            : null,
        innerLabel: sku.category === "VESSEL_SINK" ? "Basin" : "Inner",
        weightLbs: {
          min: decimal(sku.targetWeightMinLbs),
          max: decimal(sku.targetWeightMaxLbs),
        },
        // The ops Sku model doesn't carry drain / mount fields yet. The
        // BDC product data has them; once we sync those into Sku we can
        // include them here. Until then, the Python renderer just skips
        // any null fields.
        drainDiameter: null,
        drainType: null,
        mountType: null,
        hasOverflow: null,
      },
      finishes: {
        family: palette.family,
        colors: palette.colors,
        sealer: "Food-safe penetrating sealer · 4 finishes",
      },
      leadTime,
      pricing: {
        retail,
        tradePct: input.tradeDiscountPct,
        trade,
      },
      productUrl,
      tradeContact: "trade@backusdesignco.com",
      generatedAt: isoDate(today),
      validThrough: isoDate(validThrough),
    };

    ensurePdfRuntimeAvailable();

    const scriptPath = path.join(process.cwd(), "scripts", "render_trade_spec_sheet.py");
    const result = spawnSync("python3", [scriptPath], {
      input: JSON.stringify(payload),
      maxBuffer: 10 * 1024 * 1024,
    });
    if (result.status !== 0) {
      const stderr = result.stderr?.toString() || "Unknown error";
      throw new Error(`Trade spec sheet render failed: ${stderr}`);
    }

    return {
      filename: `${sku.code}-trade-spec-sheet.pdf`,
      content: result.stdout,
    };
  } finally {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      /* best effort */
    }
  }
}
