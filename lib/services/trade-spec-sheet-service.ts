import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

import {
  PDFDocument,
  PDFFont,
  PDFImage,
  PDFPage,
  StandardFonts,
  rgb,
} from "pdf-lib";

import { OutputStatus, OutputType, RecordStatus } from "@prisma/client";

import { prisma } from "@/lib/db";

// ── Trade Spec Sheet (Node-only renderer, 2 pages) ──
// Page 1: branded product overview — logo, hero image (or geometric
//   wireframe placeholder), key specs, finish palette, lead time, trade
//   pricing.
// Page 2 (only when outer dimensions are known): dimensioned technical
//   drawings — plan view, front elevation, side elevation. Auto-scaled.
//
// All values pulled from the SKU record + the active TradeMember's
// discount, so every download reflects the latest data.

const LEAD_TIME_BY_CATEGORY: Record<string, string> = {
  VESSEL_SINK: "10–12 weeks made-to-order",
  COUNTERTOP: "10–14 weeks made-to-order",
  FURNITURE: "8–10 weeks made-to-order",
  PANEL: "8–10 weeks made-to-order",
  TILE: "4–6 weeks made-to-order",
  WALL_TILE: "4–6 weeks made-to-order",
  HARD_GOOD: "Ships within 5 business days",
  CARE_KIT: "Ships within 3 business days",
};

const CATEGORY_LABEL: Record<string, string> = {
  VESSEL_SINK: "Vessel Sink",
  COUNTERTOP: "Countertop",
  FURNITURE: "Furniture",
  PANEL: "Slat Wall",
  TILE: "Tile",
  WALL_TILE: "Wall Tile",
  HARD_GOOD: "Hard Good",
  CARE_KIT: "Care Kit",
};

const CLASSIC_COLORS = [
  "Linen", "Frost", "Beach", "Graphite", "Pewter", "Storm", "Shadow", "Carbon",
];
const WOODFORM_COLORS = [
  "Mist", "Dune", "Fog", "Forest", "Grove", "Twilight", "Mocha", "Ember",
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
    case "VESSEL_SINK": return `/sinks/${slug}`;
    case "FURNITURE": return `/furniture/${slug}`;
    case "PANEL": return `/slat-wall-art/${slug}`;
    case "TILE":
    case "WALL_TILE": return `/tile/${slug}`;
    case "HARD_GOOD": return `/hard-goods/${slug}`;
    case "CARE_KIT": return `/shop/care-kits`;
    default: return "/";
  }
}

function decimalToNumber(n: unknown): number | null {
  if (n === null || n === undefined) return null;
  const v = typeof n === "string" ? parseFloat(n) : Number(n);
  return Number.isFinite(v) ? v : null;
}

function fmtNum(n: number | null): string {
  if (n === null) return "—";
  return Number.isInteger(n) ? n.toString() : n.toString();
}

function fmtMoney(n: number | null): string {
  if (n === null) return "—";
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDim(n: number | null): string {
  if (n === null) return "—";
  const r = Number(n.toFixed(2));
  return `${r}`;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// MinIO bucket where the storefront catalog publisher writes product
// imagery. URLs are stable and category-mapped — same formula as
// lib/catalog/compose-spec.ts.
const CDN_BASE = "https://cdn.opsrbstudio.com/bdc-products";
const CDN_FOLDER_BY_CATEGORY: Record<string, string | null> = {
  VESSEL_SINK: "sinks",
  FURNITURE: "furniture",
  PANEL: "slat-wall",
  TILE: "tile",
  WALL_TILE: "tile",
  HARD_GOOD: "hard-goods",
  CARE_KIT: null, // care kits use a different naming scheme; skip
};

function buildCdnImageUrl(category: string, slug: string): string | null {
  const folder = CDN_FOLDER_BY_CATEGORY[category];
  if (!folder) return null;
  return `${CDN_BASE}/${folder}/${slug}.png`;
}

/**
 * Resolve a hero image URL for a SKU. Tries in order:
 * 1. The published catalog image on the MinIO CDN — these are the
 *    real product photos used in the storefront and catalog PDF.
 * 2. The latest AI-rendered IMAGE_RENDER GeneratedImageAsset, if any.
 *    Falls back here when a SKU's catalog image hasn't been uploaded.
 * 3. null → caller falls back to the wireframe placeholder.
 *
 * For (1) we do a HEAD request to confirm the image exists before
 * returning it, so SKUs without an uploaded image don't block on a
 * 404 download attempt.
 */
async function findHeroImageUrl(
  skuId: string,
  category: string,
  slug: string,
): Promise<string | null> {
  // (1) CDN catalog image
  const cdnUrl = buildCdnImageUrl(category, slug);
  if (cdnUrl) {
    try {
      const head = await fetch(cdnUrl, { method: "HEAD" });
      if (head.ok) return cdnUrl;
    } catch {
      /* ignore — fall through */
    }
  }

  // (2) AI-rendered asset
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
  if (asset) {
    return asset.imageUrl ?? asset.filePath ?? null;
  }

  return null;
}

async function fetchImageBytes(url: string): Promise<{ bytes: Uint8Array; format: "png" | "jpg" } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const ab = await res.arrayBuffer();
    const bytes = new Uint8Array(ab);
    // Sniff magic bytes FIRST — Content-Type and filename extensions are
    // commonly wrong (e.g. our MinIO bucket serves JPEGs as image/png
    // with .png filenames). pdf-lib's embedPng/embedJpg rejects mismatches
    // with no useful error, so we have to know the real format.
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
      return { bytes, format: "png" }; // PNG: 89 50 4E 47
    }
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return { bytes, format: "jpg" }; // JPEG: FF D8 FF
    }
    // Fallback to content-type / extension if magic bytes were inconclusive.
    const ct = res.headers.get("content-type") ?? "";
    if (ct.includes("png") || url.toLowerCase().endsWith(".png")) return { bytes, format: "png" };
    if (ct.includes("jpeg") || ct.includes("jpg") || /\.jpe?g$/i.test(url)) return { bytes, format: "jpg" };
    return null;
  } catch {
    return null;
  }
}

// ── pdf-lib helpers ──

const INK = rgb(0.06, 0.09, 0.16);
const SUBTLE = rgb(0.32, 0.36, 0.44);
const LINE = rgb(0.79, 0.83, 0.88);
const ACCENT = rgb(0.65, 0.42, 0.25);
const HEAD_BG = rgb(0.06, 0.09, 0.16);
const HEAD_FG = rgb(1, 1, 1);
const CREAM = rgb(0.96, 0.94, 0.90);
const WIRE = rgb(0.45, 0.40, 0.36);

type Color = ReturnType<typeof rgb>;
type Fonts = { regular: PDFFont; bold: PDFFont; italic: PDFFont };

function drawText(page: PDFPage, text: string, x: number, y: number, opts: {
  font: PDFFont; size?: number; color?: Color;
}) {
  page.drawText(text, {
    x, y,
    size: opts.size ?? 10,
    font: opts.font,
    color: opts.color ?? INK,
  });
}

function drawLine(page: PDFPage, x1: number, y1: number, x2: number, y2: number, opts?: { thickness?: number; color?: Color }) {
  page.drawLine({
    start: { x: x1, y: y1 },
    end: { x: x2, y: y2 },
    thickness: opts?.thickness ?? 0.5,
    color: opts?.color ?? LINE,
  });
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    const tentative = current ? current + " " + w : w;
    if (font.widthOfTextAtSize(tentative, size) > maxWidth && current) {
      lines.push(current);
      current = w;
    } else {
      current = tentative;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawTextRight(page: PDFPage, text: string, rightX: number, y: number, opts: { font: PDFFont; size?: number; color?: Color }) {
  const w = opts.font.widthOfTextAtSize(text, opts.size ?? 10);
  drawText(page, text, rightX - w, y, opts);
}

// ── Wireframe placeholder (squashed isometric box + basin cutout) ──

function drawWireframeIso(
  page: PDFPage,
  cx: number,
  cy: number,
  outerL: number,
  outerW: number,
  outerH: number,
  inner: { l: number; w: number; d: number } | null,
  maxSide: number,
) {
  const longest = Math.max(outerL, outerW, outerH);
  const scale = (maxSide * 0.55) / longest;
  const dx = scale * Math.SQRT1_2;
  const dy = scale * 0.5;
  const sx = scale;
  const sz = scale;

  const project = (x: number, y: number, z: number) => ({
    px: cx + x * sx + y * dx,
    py: cy + z * sz + y * dy,
  });

  const corners = {
    A: project(0, 0, 0),
    B: project(outerL, 0, 0),
    C: project(outerL, outerW, 0),
    D: project(0, outerW, 0),
    E: project(0, 0, outerH),
    F: project(outerL, 0, outerH),
    G: project(outerL, outerW, outerH),
    H: project(0, outerW, outerH),
  };
  const drawEdge = (a: { px: number; py: number }, b: { px: number; py: number }) => {
    page.drawLine({ start: { x: a.px, y: a.py }, end: { x: b.px, y: b.py }, thickness: 0.8, color: WIRE });
  };
  // Visible top + front + side
  drawEdge(corners.E, corners.F);
  drawEdge(corners.F, corners.G);
  drawEdge(corners.G, corners.H);
  drawEdge(corners.H, corners.E);
  drawEdge(corners.A, corners.B);
  drawEdge(corners.B, corners.F);
  drawEdge(corners.A, corners.E);
  drawEdge(corners.B, corners.C);
  drawEdge(corners.C, corners.G);
  // Hide D (back-bottom): not drawn
  void corners.D;

  if (inner) {
    const insetL = (outerL - inner.l) / 2;
    const insetW = (outerW - inner.w) / 2;
    const I1 = project(insetL, insetW, outerH);
    const I2 = project(insetL + inner.l, insetW, outerH);
    const I3 = project(insetL + inner.l, insetW + inner.w, outerH);
    const I4 = project(insetL, insetW + inner.w, outerH);
    drawEdge(I1, I2);
    drawEdge(I2, I3);
    drawEdge(I3, I4);
    drawEdge(I4, I1);
    const basinFloorZ = Math.max(0, outerH - inner.d);
    const F1 = project(insetL, insetW, basinFloorZ);
    const F2 = project(insetL + inner.l, insetW, basinFloorZ);
    const F3 = project(insetL + inner.l, insetW + inner.w, basinFloorZ);
    const F4 = project(insetL, insetW + inner.w, basinFloorZ);
    drawEdge(F1, F2);
    drawEdge(F2, F3);
    drawEdge(F3, F4);
    drawEdge(F4, F1);
    drawEdge(I1, F1);
    drawEdge(I2, F2);
    drawEdge(I3, F3);
  }
}

// ── Dimension drawing ──

function drawArrow(page: PDFPage, fromX: number, fromY: number, toX: number, toY: number, color: Color = SUBTLE) {
  page.drawLine({
    start: { x: fromX, y: fromY }, end: { x: toX, y: toY },
    thickness: 0.5, color,
  });
  const angle = Math.atan2(toY - fromY, toX - fromX);
  const len = 4;
  const a1 = angle + Math.PI - 0.4;
  const a2 = angle + Math.PI + 0.4;
  page.drawLine({
    start: { x: toX, y: toY },
    end: { x: toX + Math.cos(a1) * len, y: toY + Math.sin(a1) * len },
    thickness: 0.5, color,
  });
  page.drawLine({
    start: { x: toX, y: toY },
    end: { x: toX + Math.cos(a2) * len, y: toY + Math.sin(a2) * len },
    thickness: 0.5, color,
  });
}

function drawHDim(page: PDFPage, x1: number, x2: number, y: number, label: string, font: PDFFont, ext: number = 8) {
  page.drawLine({ start: { x: x1, y: y + ext }, end: { x: x1, y }, thickness: 0.4, color: SUBTLE });
  page.drawLine({ start: { x: x2, y: y + ext }, end: { x: x2, y }, thickness: 0.4, color: SUBTLE });
  drawArrow(page, x1 + 8, y, x1 + 1, y);
  drawArrow(page, x2 - 8, y, x2 - 1, y);
  page.drawLine({ start: { x: x1 + 1, y }, end: { x: x2 - 1, y }, thickness: 0.4, color: SUBTLE });
  const labelWidth = font.widthOfTextAtSize(label, 8);
  const cx = (x1 + x2) / 2;
  drawText(page, label, cx - labelWidth / 2, y - 9, { font, size: 8, color: INK });
}

function drawVDim(page: PDFPage, y1: number, y2: number, x: number, label: string, font: PDFFont, ext: number = 8) {
  page.drawLine({ start: { x: x - ext, y: y1 }, end: { x, y: y1 }, thickness: 0.4, color: SUBTLE });
  page.drawLine({ start: { x: x - ext, y: y2 }, end: { x, y: y2 }, thickness: 0.4, color: SUBTLE });
  drawArrow(page, x, y1 + 8, x, y1 + 1);
  drawArrow(page, x, y2 - 8, x, y2 - 1);
  page.drawLine({ start: { x, y: y1 + 1 }, end: { x, y: y2 - 1 }, thickness: 0.4, color: SUBTLE });
  const cy = (y1 + y2) / 2;
  drawText(page, label, x + 4, cy - 3, { font, size: 8, color: INK });
}

/**
 * Render one orthographic view (rectangle + optional inner cavity)
 * with dimension lines + a label.
 */
function drawOrthoView(opts: {
  page: PDFPage;
  font: PDFFont;
  bold: PDFFont;
  slotX: number;
  slotY: number;
  slotW: number;
  slotH: number;
  label: string;
  objW: number;
  objH: number;
  innerW?: number | null;
  innerH?: number | null;
  drainDiameter?: number | null;
}): number {
  const PAD_LEFT = 14;
  const PAD_RIGHT = 36;
  const PAD_TOP = 18;
  const PAD_BOTTOM = 36;
  const drawW = opts.slotW - PAD_LEFT - PAD_RIGHT;
  const drawH = opts.slotH - PAD_TOP - PAD_BOTTOM;
  const scaleX = drawW / opts.objW;
  const scaleY = drawH / opts.objH;
  const scale = Math.min(scaleX, scaleY);
  const w = opts.objW * scale;
  const h = opts.objH * scale;
  const x = opts.slotX + PAD_LEFT + (drawW - w) / 2;
  const y = opts.slotY + PAD_BOTTOM + (drawH - h) / 2;

  opts.page.drawRectangle({
    x, y, width: w, height: h,
    borderColor: INK, borderWidth: 0.8,
  });

  if (opts.innerW && opts.innerH && opts.innerW > 0 && opts.innerH > 0) {
    const iw = opts.innerW * scale;
    const ih = opts.innerH * scale;
    const ix = x + (w - iw) / 2;
    const iy = y + (h - ih) / 2;
    opts.page.drawRectangle({
      x: ix, y: iy, width: iw, height: ih,
      borderColor: SUBTLE, borderWidth: 0.5,
    });
  }

  if (opts.drainDiameter && opts.drainDiameter > 0) {
    const r = (opts.drainDiameter * scale) / 2;
    opts.page.drawCircle({
      x: x + w / 2, y: y + h / 2,
      size: Math.max(r, 1.5),
      borderColor: ACCENT, borderWidth: 0.6,
    });
  }

  drawHDim(opts.page, x, x + w, y - 14, `${fmtDim(opts.objW)}"`, opts.font);
  drawVDim(opts.page, y, y + h, x + w + 6, `${fmtDim(opts.objH)}"`, opts.font);

  const labelW = opts.bold.widthOfTextAtSize(opts.label, 9);
  drawText(opts.page, opts.label, opts.slotX + opts.slotW / 2 - labelW / 2, opts.slotY + 6, {
    font: opts.bold, size: 9, color: INK,
  });

  return scale;
}

// ── Main render ──

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
      id: true, code: true, slug: true, name: true, category: true,
      finish: true, status: true, retailPrice: true,
      outerLength: true, outerWidth: true, outerHeight: true,
      innerLength: true, innerWidth: true, innerDepth: true,
      targetWeightMinLbs: true, targetWeightMaxLbs: true,
      description: true,
    },
  });
  if (!sku || sku.status !== RecordStatus.ACTIVE) return null;

  const retail = decimalToNumber(sku.retailPrice);
  const trade = retail !== null
    ? Math.round(retail * (1 - input.tradeDiscountPct / 100) * 100) / 100
    : null;

  const palette = pickColorPalette(sku.name, sku.finish);
  const leadTime = LEAD_TIME_BY_CATEGORY[sku.category] ?? "Lead time available on request";
  const categoryLabel = CATEGORY_LABEL[sku.category] ?? sku.category;
  const productUrl = `https://backusdesignco.com${pickProductPath(sku.category, sku.slug)}`;
  const today = new Date();
  const validThrough = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

  const outerL = decimalToNumber(sku.outerLength);
  const outerW = decimalToNumber(sku.outerWidth);
  const outerH = decimalToNumber(sku.outerHeight);
  const innerL = decimalToNumber(sku.innerLength);
  const innerW = decimalToNumber(sku.innerWidth);
  const innerD = decimalToNumber(sku.innerDepth);
  const wMin = decimalToNumber(sku.targetWeightMinLbs);
  const wMax = decimalToNumber(sku.targetWeightMaxLbs);
  const hasOuterDims = outerL !== null && outerW !== null && outerH !== null;

  const heroUrl = await findHeroImageUrl(sku.id, sku.category, sku.slug);
  const heroBytes = heroUrl ? await fetchImageBytes(heroUrl) : null;

  const pdf = await PDFDocument.create();
  const fonts: Fonts = {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
    italic: await pdf.embedFont(StandardFonts.HelveticaOblique),
  };

  let logo: PDFImage | null = null;
  try {
    const logoPath = path.join(process.cwd(), "public", "rb-studio-logo-white.png");
    if (existsSync(logoPath)) {
      logo = await pdf.embedPng(readFileSync(logoPath));
    }
  } catch {
    /* ignore */
  }

  let hero: PDFImage | null = null;
  if (heroBytes) {
    try {
      hero = heroBytes.format === "png"
        ? await pdf.embedPng(heroBytes.bytes)
        : await pdf.embedJpg(heroBytes.bytes);
    } catch {
      hero = null;
    }
  }

  const PAGE_W = 612;
  const PAGE_H = 792;
  const M = 48;
  const HEADER_H = 56;

  const drawHeader = (p: PDFPage, rightLine1: string, rightLine2: string) => {
    p.drawRectangle({
      x: 0, y: PAGE_H - HEADER_H, width: PAGE_W, height: HEADER_H, color: HEAD_BG,
    });
    if (logo) {
      const logoH = 28;
      const ratio = logoH / logo.height;
      const logoW = logo.width * ratio;
      p.drawImage(logo, { x: M, y: PAGE_H - HEADER_H + (HEADER_H - logoH) / 2, width: logoW, height: logoH });
    } else {
      drawText(p, "BACKUS DESIGN CO", M, PAGE_H - HEADER_H / 2 - 4, {
        font: fonts.bold, size: 14, color: HEAD_FG,
      });
    }
    drawTextRight(p, rightLine1, PAGE_W - M, PAGE_H - HEADER_H / 2 + 2, {
      font: fonts.bold, size: 11, color: HEAD_FG,
    });
    drawTextRight(p, rightLine2, PAGE_W - M, PAGE_H - HEADER_H / 2 - 12, {
      font: fonts.regular, size: 8, color: rgb(0.7, 0.74, 0.78),
    });
  };

  // ── PAGE 1 ──
  const page = pdf.addPage([PAGE_W, PAGE_H]);
  drawHeader(page, "TRADE SPEC SHEET", `Generated ${isoDate(today)}`);

  let y = PAGE_H - HEADER_H - 36;
  drawText(page, `${sku.code}   ·   ${categoryLabel}`, M, y, {
    font: fonts.bold, size: 10, color: ACCENT,
  });
  y -= 26;
  drawText(page, sku.name, M, y, { font: fonts.bold, size: 26, color: INK });
  y -= 22;
  drawText(page, sku.finish || categoryLabel, M, y, { font: fonts.italic, size: 12, color: SUBTLE });
  y -= 16;

  // Hero block
  const heroAreaTop = y;
  const heroAreaH = 240;
  const heroAreaBottom = y - heroAreaH;
  page.drawRectangle({
    x: M, y: heroAreaBottom, width: PAGE_W - 2 * M, height: heroAreaH,
    color: CREAM,
  });
  if (hero) {
    const pad = 14;
    const maxW = PAGE_W - 2 * M - pad * 2;
    const maxH = heroAreaH - pad * 2;
    const ratio = Math.min(maxW / hero.width, maxH / hero.height);
    const drawW = hero.width * ratio;
    const drawH = hero.height * ratio;
    const cx = M + (PAGE_W - 2 * M) / 2;
    const cy = heroAreaBottom + heroAreaH / 2;
    page.drawImage(hero, { x: cx - drawW / 2, y: cy - drawH / 2, width: drawW, height: drawH });
  } else if (hasOuterDims) {
    const cx = M + (PAGE_W - 2 * M) / 2 - 30;
    const cy = heroAreaBottom + heroAreaH / 2 - 60;
    drawWireframeIso(page, cx, cy, outerL!, outerW!, outerH!,
      innerL && innerW && innerD ? { l: innerL, w: innerW, d: innerD } : null,
      Math.min(PAGE_W - 2 * M - 32, heroAreaH - 32),
    );
    drawText(page, "Geometric reference — photography in production",
      M + 16, heroAreaBottom + 14, { font: fonts.italic, size: 8, color: SUBTLE });
  } else {
    drawText(page, "Photography in production",
      M + 16, heroAreaBottom + heroAreaH / 2, { font: fonts.italic, size: 10, color: SUBTLE });
  }
  void heroAreaTop;
  y = heroAreaBottom - 24;

  // Two-column body
  const COL_GAP = 28;
  const COL_W = (PAGE_W - 2 * M - COL_GAP) / 2;
  const LEFT_X = M;
  const RIGHT_X = M + COL_W + COL_GAP;
  let leftY = y;
  let rightY = y;

  const sectionH = (txt: string, x: number, y0: number) => {
    drawText(page, txt, x, y0, { font: fonts.bold, size: 8, color: ACCENT });
    drawLine(page, x, y0 - 4, x + COL_W, y0 - 4, { thickness: 0.5, color: LINE });
    return y0 - 14;
  };
  const kv = (label: string, value: string, x: number, y0: number, labelW = 60) => {
    drawText(page, label, x, y0, { font: fonts.regular, size: 9, color: SUBTLE });
    drawText(page, value, x + labelW, y0, { font: fonts.regular, size: 10, color: INK });
    return y0 - 14;
  };

  leftY = sectionH("DIMENSIONS", LEFT_X, leftY);
  if (hasOuterDims) {
    leftY = kv("Outer", `${fmtDim(outerL)} × ${fmtDim(outerW)} × ${fmtDim(outerH)} in`, LEFT_X, leftY);
  }
  if (innerL !== null && innerW !== null && innerD !== null) {
    const innerLabel = sku.category === "VESSEL_SINK" ? "Basin" : "Inner";
    leftY = kv(innerLabel, `${fmtDim(innerL)} × ${fmtDim(innerW)} × ${fmtDim(innerD)} in`, LEFT_X, leftY);
  }
  if (wMin !== null && wMax !== null && wMin !== wMax) {
    leftY = kv("Weight", `${fmtNum(wMin)}–${fmtNum(wMax)} lbs`, LEFT_X, leftY);
  } else if (wMin !== null) {
    leftY = kv("Weight", `${fmtNum(wMin)} lbs`, LEFT_X, leftY);
  }
  if (!hasOuterDims && wMin === null) {
    leftY = kv("", "Available on request", LEFT_X, leftY, 0);
  }

  leftY -= 10;
  leftY = sectionH("FINISHES", LEFT_X, leftY);
  drawText(page, `${palette.family} palette (${palette.colors.length} colors):`, LEFT_X, leftY, {
    font: fonts.bold, size: 10, color: INK,
  });
  leftY -= 13;
  for (const line of wrapText(palette.colors.join("  ·  "), fonts.regular, 10, COL_W)) {
    drawText(page, line, LEFT_X, leftY, { font: fonts.regular, size: 10, color: INK });
    leftY -= 13;
  }
  leftY -= 4;
  drawText(page, "Sealer:", LEFT_X, leftY, { font: fonts.bold, size: 10, color: INK });
  drawText(page, "Food-safe penetrating · 4 finishes", LEFT_X + 38, leftY, {
    font: fonts.regular, size: 10, color: INK,
  });

  rightY = sectionH("LEAD TIME", RIGHT_X, rightY);
  for (const line of wrapText(leadTime, fonts.regular, 10, COL_W)) {
    drawText(page, line, RIGHT_X, rightY, { font: fonts.regular, size: 10, color: INK });
    rightY -= 14;
  }
  rightY -= 12;

  rightY = sectionH(`TRADE PRICING (${input.tradeDiscountPct}% off)`, RIGHT_X, rightY);
  drawText(page, "Retail", RIGHT_X, rightY, { font: fonts.regular, size: 9, color: SUBTLE });
  drawText(page, fmtMoney(retail), RIGHT_X + 60, rightY, { font: fonts.regular, size: 11, color: SUBTLE });
  rightY -= 22;
  drawText(page, "Trade", RIGHT_X, rightY, { font: fonts.regular, size: 9, color: SUBTLE });
  drawText(page, fmtMoney(trade), RIGHT_X + 60, rightY, { font: fonts.bold, size: 18, color: INK });
  rightY -= 18;
  drawText(page, `Pricing valid through ${isoDate(validThrough)}`, RIGHT_X, rightY, {
    font: fonts.italic, size: 9, color: SUBTLE,
  });

  // Care + warranty
  const careY = Math.min(leftY, rightY) - 18;
  drawText(page, "CARE & WARRANTY", LEFT_X, careY, { font: fonts.bold, size: 8, color: ACCENT });
  drawLine(page, LEFT_X, careY - 4, PAGE_W - M, careY - 4, { thickness: 0.5, color: LINE });
  let cy = careY - 16;
  for (const line of wrapText(
    "Sealed glass-fiber-reinforced concrete (GFRC). Clean with mild soap and water — no abrasives or acids. Re-seal every 12–18 months for high-traffic surfaces. Lifetime structural warranty against manufacturing defects.",
    fonts.regular, 10, PAGE_W - 2 * M,
  )) {
    drawText(page, line, LEFT_X, cy, { font: fonts.regular, size: 10, color: INK });
    cy -= 13;
  }

  const footerY = M;
  drawLine(page, M, footerY + 14, PAGE_W - M, footerY + 14, { thickness: 0.5, color: LINE });
  const footer = `${productUrl}   ·   trade@backusdesignco.com   ·   Page 1`;
  const footerW = fonts.regular.widthOfTextAtSize(footer, 8);
  drawText(page, footer, (PAGE_W - footerW) / 2, footerY, { font: fonts.regular, size: 8, color: SUBTLE });

  // ── PAGE 2 — Technical drawings (only if we have outer dims) ──
  if (hasOuterDims) {
    const p2 = pdf.addPage([PAGE_W, PAGE_H]);
    drawHeader(p2, "TECHNICAL DRAWINGS", `${sku.code} · ${sku.name}`);

    let yy = PAGE_H - HEADER_H - 28;
    drawText(p2, "All dimensions in inches. Hand-cast pieces vary ±1/8\" per pour.",
      M, yy, { font: fonts.italic, size: 9, color: SUBTLE });
    yy -= 18;

    // PLAN VIEW
    const planSlotH = 280;
    const planSlotW = PAGE_W - 2 * M;
    const planSlotY = yy - planSlotH;
    p2.drawRectangle({
      x: M, y: planSlotY, width: planSlotW, height: planSlotH,
      color: rgb(0.99, 0.98, 0.97),
    });
    drawOrthoView({
      page: p2, font: fonts.regular, bold: fonts.bold,
      slotX: M, slotY: planSlotY, slotW: planSlotW, slotH: planSlotH,
      label: "PLAN VIEW (top-down)",
      objW: outerL!, objH: outerW!,
      innerW: innerL, innerH: innerW,
      drainDiameter: sku.category === "VESSEL_SINK" ? 1.75 : null,
    });
    yy = planSlotY - 16;

    // FRONT + SIDE elevations
    const elevSlotH = 220;
    const elevSlotW = (planSlotW - 16) / 2;
    const elevSlotY = yy - elevSlotH;

    p2.drawRectangle({
      x: M, y: elevSlotY, width: elevSlotW, height: elevSlotH,
      color: rgb(0.99, 0.98, 0.97),
    });
    drawOrthoView({
      page: p2, font: fonts.regular, bold: fonts.bold,
      slotX: M, slotY: elevSlotY, slotW: elevSlotW, slotH: elevSlotH,
      label: "FRONT ELEVATION",
      objW: outerL!, objH: outerH!,
      innerW: innerL, innerH: innerD,
    });

    p2.drawRectangle({
      x: M + elevSlotW + 16, y: elevSlotY, width: elevSlotW, height: elevSlotH,
      color: rgb(0.99, 0.98, 0.97),
    });
    drawOrthoView({
      page: p2, font: fonts.regular, bold: fonts.bold,
      slotX: M + elevSlotW + 16, slotY: elevSlotY, slotW: elevSlotW, slotH: elevSlotH,
      label: "SIDE ELEVATION",
      objW: outerW!, objH: outerH!,
      innerW: innerW, innerH: innerD,
    });

    yy = elevSlotY - 24;

    if (sku.category === "VESSEL_SINK") {
      drawText(p2, "MOUNT & DRAIN", M, yy, { font: fonts.bold, size: 8, color: ACCENT });
      drawLine(p2, M, yy - 4, PAGE_W - M, yy - 4, { thickness: 0.5, color: LINE });
      yy -= 16;
      const notes = [
        "Wall-mount with concealed studs; supply 4× 1/4-20 stainless threaded rod, min 4\" embedment.",
        "Drain: 1.75\" round outlet, accepts standard 1.5\" tailpiece via included flange.",
        "Allow 1\" clearance behind unit for plumbing.",
      ];
      for (const n of notes) {
        for (const line of wrapText("·  " + n, fonts.regular, 10, PAGE_W - 2 * M)) {
          drawText(p2, line, M, yy, { font: fonts.regular, size: 10, color: INK });
          yy -= 13;
        }
        yy -= 2;
      }
    }

    drawLine(p2, M, footerY + 14, PAGE_W - M, footerY + 14, { thickness: 0.5, color: LINE });
    const f2 = `${productUrl}   ·   trade@backusdesignco.com   ·   Page 2 — Technical Drawings`;
    const f2W = fonts.regular.widthOfTextAtSize(f2, 8);
    drawText(p2, f2, (PAGE_W - f2W) / 2, footerY, { font: fonts.regular, size: 8, color: SUBTLE });
  }

  const pdfBytes = await pdf.save();
  return {
    filename: `${sku.code}-trade-spec-sheet.pdf`,
    content: Buffer.from(pdfBytes),
  };
}
