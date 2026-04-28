/**
 * Compose a fully-hydrated catalog spec from editorial content + Sku data.
 *
 * The spec is what the BDC flipbook reads (via JSON) and what the PDF
 * renderer consumes. Product data comes live from the Sku table — the
 * spec auto-reflects price, dimensions, and SKU lifecycle changes.
 */

import { prisma } from "@/lib/db";
import { decimalToNumber } from "@/lib/services/service-helpers";
import { CATALOG_CONTENT } from "./catalog-content";

const STOREFRONT_BASE = "https://backusdesignco.com";
// MinIO is path-style, so direct CDN access needs the bucket name.
const CDN_BASE = "https://cdn.opsrbstudio.com/bdc-products";

// Map BDC URL segment → MinIO folder for that category's images.
const IMAGE_FOLDER_BY_SEGMENT: Record<string, string> = {
  sinks: "sinks",
  furniture: "furniture",
  "slat-wall-art": "slat-wall",
  tile: "tile",
  "hard-goods": "hard-goods",
};

// CAF SkuCategory → BDC URL segment.
const URL_SEGMENT_BY_CATEGORY: Record<string, string> = {
  VESSEL_SINK: "sinks",
  FURNITURE: "furniture",
  PANEL: "slat-wall-art",
  WALL_TILE: "tile",
  HARD_GOOD: "hard-goods",
};

export type CatalogProduct = {
  sku: string;
  slug: string;
  name: string;
  category: string;
  retailPrice: number | null;
  priceLabel: string;
  finish: string | null;
  imageUrl: string;
  productUrl: string;
  qualifierLine: string;
  dimensionsLine: string | null;
};

export type CatalogSpec = {
  meta: {
    version: number;
    title: string;
    subtitle: string;
    publishedAt: string;
    storefrontBase: string;
    cdnBase: string;
  };
  cover: typeof CATALOG_CONTENT.cover;
  designerLetter: typeof CATALOG_CONTENT.designerLetter;
  studio: typeof CATALOG_CONTENT.studio;
  market: typeof CATALOG_CONTENT.market;
  colorGuide: typeof CATALOG_CONTENT.colorGuide;
  finishesGuide: typeof CATALOG_CONTENT.finishesGuide;
  sections: Array<{
    code: string;
    bdcCategory: string;
    bdcUrlSegment: string;
    title: string;
    eyebrow: string;
    intro: string;
    products: CatalogProduct[];
  }>;
  care: typeof CATALOG_CONTENT.care & { kits: CatalogProduct[] };
  commissions: typeof CATALOG_CONTENT.commissions;
  trade: typeof CATALOG_CONTENT.trade;
  leadTimes: typeof CATALOG_CONTENT.leadTimes;
  glossary: typeof CATALOG_CONTENT.glossary;
  contact: typeof CATALOG_CONTENT.contact;
};

function formatDimensions(sku: {
  outerLength: import("@prisma/client").Prisma.Decimal | null;
  outerWidth: import("@prisma/client").Prisma.Decimal | null;
  outerHeight: import("@prisma/client").Prisma.Decimal | null;
}): string | null {
  const l = decimalToNumber(sku.outerLength);
  const w = decimalToNumber(sku.outerWidth);
  const h = decimalToNumber(sku.outerHeight);
  if (l == null || w == null || h == null) return null;
  const fmt = (v: number) => (Number.isInteger(v) ? `${v}` : v.toFixed(1).replace(/\.0$/, ""));
  return `${fmt(l)}" \u00d7 ${fmt(w)}" \u00d7 ${fmt(h)}"`;
}

function priceLabelFor(retailPrice: number | null, status: string, code: string): string {
  if (retailPrice == null) return "Quoted";
  // Hard goods and small in-stock items list the price flat; bigger MTO
  // pieces use "from" pricing because customers customize finish.
  const flatPriced = code.startsWith("HG") || code === "S7-ROUND" || code === "S8-OVAL" || code === "F5-BASIN" || code === "F6-STUMP" || code === "F1-MONOLITH";
  const formatted = `$${retailPrice.toLocaleString("en-US")}`;
  if (flatPriced) return formatted;
  return `from ${formatted}`;
}

function qualifierFor(code: string, status: string): string {
  if (status === "ARCHIVED") return "archived";
  if (code.startsWith("HG") || code === "S7-ROUND" || code === "S8-OVAL" || code === "F5-BASIN") {
    return "in stock";
  }
  return "made to order";
}

export async function composeCatalogSpec(version: number): Promise<CatalogSpec> {
  const skus = await prisma.sku.findMany({
    where: {
      status: "ACTIVE",
      category: { in: ["VESSEL_SINK", "FURNITURE", "PANEL", "WALL_TILE", "HARD_GOOD", "CARE_KIT"] },
    },
    orderBy: { code: "asc" },
  });

  type ProductSku = (typeof skus)[number];

  const buildProduct = (sku: ProductSku): CatalogProduct => {
    const urlSegment = URL_SEGMENT_BY_CATEGORY[sku.category as string] ?? "";
    const imageFolder = IMAGE_FOLDER_BY_SEGMENT[urlSegment] ?? urlSegment;
    const retailPrice = decimalToNumber(sku.retailPrice);
    return {
      sku: sku.code,
      slug: sku.slug,
      name: sku.name,
      category: sku.category as string,
      retailPrice,
      priceLabel: priceLabelFor(retailPrice, sku.status, sku.code),
      finish: sku.finish ?? null,
      imageUrl: `${CDN_BASE}/${imageFolder}/${sku.slug}.png`,
      productUrl: urlSegment ? `${STOREFRONT_BASE}/${urlSegment}/${sku.slug}` : STOREFRONT_BASE,
      qualifierLine: qualifierFor(sku.code, sku.status),
      dimensionsLine: formatDimensions(sku),
    };
  };

  // Only include SKUs that exist on the BDC storefront. Some PANEL SKUs
  // (P1-P5: Ridge, Dune, Flute, Brick, Ashlar) live in CAF for ops but
  // aren't on the storefront — exclude those so the catalog doesn't have
  // dead links.
  const STOREFRONT_SKU_PREFIXES = ["S", "F", "T", "P6", "P7", "P8", "P9", "HG"];
  const isOnStorefront = (code: string) =>
    STOREFRONT_SKU_PREFIXES.some((p) => code.startsWith(p));

  const sections = CATALOG_CONTENT.sections.map((section) => {
    const products = skus
      .filter((s: ProductSku) =>
        URL_SEGMENT_BY_CATEGORY[s.category as string] === section.bdcUrlSegment
        && isOnStorefront(s.code),
      )
      .map(buildProduct);
    return { ...section, products };
  });

  // Care kits — pull RBS-CARE-KIT-* from CAF as their own block.
  const careKitSkus = skus.filter((s: ProductSku) => s.code.startsWith("RBS-CARE-KIT-"));
  const careKits: CatalogProduct[] = careKitSkus.map((sku: ProductSku) => {
    const retailPrice = decimalToNumber(sku.retailPrice);
    return {
      sku: sku.code,
      slug: sku.slug,
      name: sku.name,
      category: "CARE_KIT",
      retailPrice,
      priceLabel: retailPrice == null ? "Quoted" : `$${retailPrice.toLocaleString("en-US")}`,
      finish: null,
      imageUrl: `${CDN_BASE}/care/${sku.code.toLowerCase().replace("rbs-care-kit-s", "sink-care-kit").replace("rbs-care-kit-f", "furniture-care-kit").replace("rbs-care-kit-w", "wall-tile-care-kit").replace("rbs-care-kit-repair", "repair-kit")}.png`,
      productUrl: `${STOREFRONT_BASE}/shop/care-kits/${sku.slug.replace("rbs-care-kit-sink", "rb-studio-sink-care-kit").replace("rbs-care-kit-furniture", "rb-studio-furniture-care-kit").replace("rbs-care-kit-wall-tile", "rb-studio-wall-tile-care-kit").replace("rbs-care-kit-repair", "rb-studio-chip-repair-kit")}`,
      qualifierLine: "in stock",
      dimensionsLine: null,
    };
  });

  return {
    meta: {
      version,
      title: CATALOG_CONTENT.meta.title,
      subtitle: CATALOG_CONTENT.meta.subtitle,
      publishedAt: new Date().toISOString(),
      storefrontBase: STOREFRONT_BASE,
      cdnBase: CDN_BASE,
    },
    cover: CATALOG_CONTENT.cover,
    designerLetter: CATALOG_CONTENT.designerLetter,
    studio: CATALOG_CONTENT.studio,
    market: CATALOG_CONTENT.market,
    colorGuide: CATALOG_CONTENT.colorGuide,
    finishesGuide: CATALOG_CONTENT.finishesGuide,
    sections,
    care: { ...CATALOG_CONTENT.care, kits: careKits },
    commissions: CATALOG_CONTENT.commissions,
    trade: CATALOG_CONTENT.trade,
    leadTimes: CATALOG_CONTENT.leadTimes,
    glossary: CATALOG_CONTENT.glossary,
    contact: CATALOG_CONTENT.contact,
  };
}
