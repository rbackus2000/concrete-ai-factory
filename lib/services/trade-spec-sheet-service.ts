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
 * Find the latest BLUEPRINT_RENDER image for a SKU. Reads the base64
 * directly from GeneratedImageAsset.metadataJson — same data the
 * /api/images/[id] public route serves, but without a self-call.
 */
async function findBlueprintRenderBytes(
  skuId: string,
): Promise<{ bytes: Uint8Array; format: "png" | "jpg" } | null> {
  const asset = await prisma.generatedImageAsset.findFirst({
    where: {
      status: OutputStatus.GENERATED,
      generatedOutput: {
        skuId,
        outputType: OutputType.BLUEPRINT_RENDER,
        status: { in: [OutputStatus.GENERATED, OutputStatus.APPROVED] },
      },
    },
    orderBy: { createdAt: "desc" },
    select: { metadataJson: true, imageUrl: true, filePath: true },
  });
  if (!asset) return null;

  // Try inline base64 first (gpt-image-1 path stores it here)
  const meta = asset.metadataJson as Record<string, unknown> | null;
  const b64 = meta?.["imageBase64"];
  if (typeof b64 === "string" && b64.length > 0) {
    const buf = Buffer.from(b64, "base64");
    const bytes = new Uint8Array(buf);
    if (bytes[0] === 0xff && bytes[1] === 0xd8) return { bytes, format: "jpg" };
    return { bytes, format: "png" };
  }

  // Fall back to URL fetch if the asset has one
  const url = asset.imageUrl ?? asset.filePath;
  if (url && url.startsWith("http")) {
    return fetchImageBytes(url);
  }

  return null;
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

// ─────────────────────────────────────────────────────────
// Procedural blueprint (page 3) — pure pdf-lib, no AI.
// Cobalt-blue background, white lines, perfect text every time.
// ─────────────────────────────────────────────────────────

const BP_BG = rgb(0.039, 0.086, 0.157);   // #0a1628 cobalt
const BP_INK = rgb(1, 1, 1);              // white lines + text
const BP_DIM = rgb(0.65, 0.72, 0.82);     // muted blue-grey for dim lines
const BP_ACCENT = rgb(0.85, 0.66, 0.45);  // warm tan for emphasis (drain, clip body)

type BpDrawCtx = {
  page: PDFPage;
  fonts: Fonts;
};

function bpText(ctx: BpDrawCtx, text: string, x: number, y: number, opts?: {
  font?: PDFFont; size?: number; color?: Color;
}) {
  ctx.page.drawText(text, {
    x, y,
    size: opts?.size ?? 8,
    font: opts?.font ?? ctx.fonts.regular,
    color: opts?.color ?? BP_INK,
  });
}

function bpLine(ctx: BpDrawCtx, x1: number, y1: number, x2: number, y2: number, opts?: { thickness?: number; color?: Color }) {
  ctx.page.drawLine({
    start: { x: x1, y: y1 }, end: { x: x2, y: y2 },
    thickness: opts?.thickness ?? 0.6, color: opts?.color ?? BP_INK,
  });
}

function bpRect(ctx: BpDrawCtx, x: number, y: number, w: number, h: number, opts?: { thickness?: number; color?: Color; fill?: Color }) {
  ctx.page.drawRectangle({
    x, y, width: w, height: h,
    borderColor: opts?.color ?? BP_INK,
    borderWidth: opts?.thickness ?? 0.6,
    color: opts?.fill,
  });
}

function bpArrow(ctx: BpDrawCtx, fromX: number, fromY: number, toX: number, toY: number, color: Color = BP_DIM) {
  ctx.page.drawLine({
    start: { x: fromX, y: fromY }, end: { x: toX, y: toY },
    thickness: 0.5, color,
  });
  const ang = Math.atan2(toY - fromY, toX - fromX);
  const len = 4;
  ctx.page.drawLine({
    start: { x: toX, y: toY },
    end: { x: toX + Math.cos(ang + Math.PI - 0.4) * len, y: toY + Math.sin(ang + Math.PI - 0.4) * len },
    thickness: 0.5, color,
  });
  ctx.page.drawLine({
    start: { x: toX, y: toY },
    end: { x: toX + Math.cos(ang + Math.PI + 0.4) * len, y: toY + Math.sin(ang + Math.PI + 0.4) * len },
    thickness: 0.5, color,
  });
}

/** Horizontal dimension line BELOW a shape, label centered above the line. */
function bpHDim(ctx: BpDrawCtx, x1: number, x2: number, y: number, label: string) {
  bpLine(ctx, x1, y + 6, x1, y, { thickness: 0.4, color: BP_DIM });
  bpLine(ctx, x2, y + 6, x2, y, { thickness: 0.4, color: BP_DIM });
  bpArrow(ctx, x1 + 6, y, x1 + 1, y);
  bpArrow(ctx, x2 - 6, y, x2 - 1, y);
  bpLine(ctx, x1 + 1, y, x2 - 1, y, { thickness: 0.4, color: BP_DIM });
  const w = ctx.fonts.regular.widthOfTextAtSize(label, 7);
  // White-text label sits centered, slightly above the line — over the cobalt background it reads cleanly.
  bpText(ctx, label, (x1 + x2) / 2 - w / 2, y + 2, { size: 7, color: BP_INK });
}

/** Vertical dimension line to the RIGHT of a shape. */
function bpVDim(ctx: BpDrawCtx, y1: number, y2: number, x: number, label: string) {
  bpLine(ctx, x - 6, y1, x, y1, { thickness: 0.4, color: BP_DIM });
  bpLine(ctx, x - 6, y2, x, y2, { thickness: 0.4, color: BP_DIM });
  bpArrow(ctx, x, y1 + 6, x, y1 + 1);
  bpArrow(ctx, x, y2 - 6, x, y2 - 1);
  bpLine(ctx, x, y1 + 1, x, y2 - 1, { thickness: 0.4, color: BP_DIM });
  bpText(ctx, label, x + 3, (y1 + y2) / 2 - 3, { size: 7, color: BP_INK });
}

/** Faint background grid — subtle, every 36pt. */
function drawBlueprintGrid(ctx: BpDrawCtx, x: number, y: number, w: number, h: number) {
  const step = 36;
  const grid = rgb(0.10, 0.16, 0.24); // very faint blue
  for (let gx = x; gx <= x + w; gx += step) {
    ctx.page.drawLine({ start: { x: gx, y }, end: { x: gx, y: y + h }, thickness: 0.3, color: grid });
  }
  for (let gy = y; gy <= y + h; gy += step) {
    ctx.page.drawLine({ start: { x, y: gy }, end: { x: x + w, y: gy }, thickness: 0.3, color: grid });
  }
}

/** Slot-aware orthographic view drawer for the blueprint canvas. */
function bpOrthoView(ctx: BpDrawCtx, opts: {
  slotX: number; slotY: number; slotW: number; slotH: number;
  label: string;
  objW: number; objH: number;
  innerW?: number | null; innerH?: number | null;
  drainCircle?: { diameter: number } | null;
  showInnerLabel?: string;
}): void {
  const PAD_L = 14, PAD_R = 28, PAD_T = 14, PAD_B = 30;
  const drawW = opts.slotW - PAD_L - PAD_R;
  const drawH = opts.slotH - PAD_T - PAD_B;
  const scale = Math.min(drawW / opts.objW, drawH / opts.objH);
  const w = opts.objW * scale, h = opts.objH * scale;
  const x = opts.slotX + PAD_L + (drawW - w) / 2;
  const y = opts.slotY + PAD_B + (drawH - h) / 2;

  bpRect(ctx, x, y, w, h, { thickness: 0.8 });

  if (opts.innerW && opts.innerH && opts.innerW > 0 && opts.innerH > 0) {
    const iw = opts.innerW * scale, ih = opts.innerH * scale;
    const ix = x + (w - iw) / 2, iy = y + (h - ih) / 2;
    bpRect(ctx, ix, iy, iw, ih, { thickness: 0.5, color: BP_DIM });
  }
  if (opts.drainCircle && opts.drainCircle.diameter > 0) {
    const r = (opts.drainCircle.diameter * scale) / 2;
    ctx.page.drawCircle({
      x: x + w / 2, y: y + h / 2,
      size: Math.max(r, 1.5),
      borderColor: BP_ACCENT, borderWidth: 0.7,
    });
  }

  bpHDim(ctx, x, x + w, y - 14, `${fmtDim(opts.objW)}"`);
  bpVDim(ctx, y, y + h, x + w + 6, `${fmtDim(opts.objH)}"`);

  const w2 = ctx.fonts.bold.widthOfTextAtSize(opts.label, 8);
  bpText(ctx, opts.label, opts.slotX + opts.slotW / 2 - w2 / 2, opts.slotY + 6, {
    font: ctx.fonts.bold, size: 8, color: BP_INK,
  });
}

/** Detailed Z-clip cross-section for the panel category. */
function drawZClipSectionDetail(ctx: BpDrawCtx, opts: {
  slotX: number; slotY: number; slotW: number; slotH: number;
}) {
  const PAD = 18;
  const drawX = opts.slotX + PAD, drawY = opts.slotY + 30;
  const drawW = opts.slotW - 2 * PAD, drawH = opts.slotH - 50;

  // Coordinate system: wall on left, panel on right, gap between
  const wallX = drawX + 28;        // wall face X
  const panelBackX = wallX + 92;   // back of panel X
  const panelFaceX = drawX + drawW - 30; // front face of panel
  const cy = drawY + drawH / 2;

  // ── Wall ──
  // Hatched wall to the left of wallX
  for (let i = 0; i < 6; i++) {
    bpLine(ctx, drawX + i * 4, cy - drawH / 2 + 8, drawX + i * 4 + 8, cy + drawH / 2 - 8, { thickness: 0.4, color: BP_DIM });
  }
  bpLine(ctx, wallX, cy - drawH / 2, wallX, cy + drawH / 2, { thickness: 0.8 });
  // (No "WALL STUD" label — the hatching pattern conveys wall, and the
  // WOOD SCREW INTO STUD arrow already labels the wall context. A
  // separate label here was colliding with the EXTRUSION caption above.)

  // ── Wall-side Z-clip (Z-shape attached to wall) ──
  // Z-shape: top tab going right, vertical web, bottom tab back to wall
  const wallClipBottomY = cy - 18;
  const wallClipTopY = cy + 18;
  const wallClipWebX = wallX + 20;
  const wallClipHookY = cy + 10;
  // bottom tab
  bpLine(ctx, wallX, wallClipBottomY, wallClipWebX, wallClipBottomY, { thickness: 0.9 });
  bpLine(ctx, wallClipWebX, wallClipBottomY, wallClipWebX, wallClipHookY, { thickness: 0.9 });
  // hook
  bpLine(ctx, wallClipWebX, wallClipHookY, wallClipWebX + 10, wallClipHookY, { thickness: 0.9 });
  bpLine(ctx, wallClipWebX + 10, wallClipHookY, wallClipWebX + 10, wallClipHookY + 6, { thickness: 0.9 });

  // Screw arrow into wall clip
  bpArrow(ctx, wallClipWebX - 30, wallClipBottomY - 14, wallX - 2, wallClipBottomY - 6, BP_ACCENT);
  bpText(ctx, "WOOD SCREW INTO STUD", wallClipWebX - 30, wallClipBottomY - 22, { size: 6.5, color: BP_ACCENT });

  // ── Panel-side Z-clip (mirror Z, attached to panel back) ──
  const panelClipWebX = panelBackX - 20;
  const panelClipTopY = cy + 18;
  const panelClipHookY = cy + 4;
  // top tab against panel back
  bpLine(ctx, panelClipWebX, panelClipTopY, panelBackX, panelClipTopY, { thickness: 0.9 });
  // web
  bpLine(ctx, panelClipWebX, panelClipTopY, panelClipWebX, panelClipHookY, { thickness: 0.9 });
  // hook (catches the wall-clip hook)
  bpLine(ctx, panelClipWebX, panelClipHookY, panelClipWebX - 10, panelClipHookY, { thickness: 0.9 });
  bpLine(ctx, panelClipWebX - 10, panelClipHookY, panelClipWebX - 10, panelClipHookY - 6, { thickness: 0.9 });

  // ── GFRC panel ──
  bpRect(ctx, panelBackX, drawY + 14, panelFaceX - panelBackX, drawH - 28, { thickness: 0.9 });
  bpText(ctx, "GFRC PANEL", panelBackX + 6, drawY + drawH - 22, { size: 7, color: BP_INK });

  // Epoxy + screw label on the panel-side clip-to-panel bond
  bpArrow(ctx, panelBackX + 60, panelClipTopY + 22, panelBackX + 4, panelClipTopY + 4, BP_ACCENT);
  bpText(ctx, "EPOXY + 4x #10 SS SCREWS", panelBackX + 18, panelClipTopY + 30, { size: 6.5, color: BP_ACCENT });

  // 1/16" gap label between wall and panel — leader line going up-and-over
  const gapMidX = (wallX + panelBackX) / 2;
  const labelY = drawY + drawH - 10;
  bpArrow(ctx, gapMidX, labelY - 6, gapMidX, cy + 22, BP_DIM);
  bpText(ctx, "1/16 in PANEL-TO-WALL", gapMidX - 32, labelY, { size: 6.5, color: BP_DIM });

  // Clip extrusion label — moved to the very top of the slot, away from the drawing
  bpText(ctx, "1.5 in ALUMINUM Z-CLIP EXTRUSION", drawX + 4, drawY + drawH + 4, { size: 6.5, color: BP_INK });

  // Section label (kept at slot bottom — sits above the page footer)
  const sectLabel = "SECTION A-A — Z-CLIP DETAIL";
  const sw = ctx.fonts.bold.widthOfTextAtSize(sectLabel, 8);
  bpText(ctx, sectLabel, opts.slotX + opts.slotW / 2 - sw / 2, opts.slotY + 8, {
    font: ctx.fonts.bold, size: 8, color: BP_INK,
  });
}

/** Exploded clip pair — the small Mounting Hardware inset. */
function drawZClipExploded(ctx: BpDrawCtx, opts: { slotX: number; slotY: number; slotW: number; slotH: number }) {
  const cx = opts.slotX + opts.slotW / 2;
  const topY = opts.slotY + opts.slotH - 30;
  const botY = opts.slotY + 28;

  // Top clip (panel side)
  const w = 60;
  bpLine(ctx, cx - w / 2, topY, cx + w / 2, topY, { thickness: 0.9 });
  bpLine(ctx, cx + w / 2, topY, cx + w / 2, topY - 8, { thickness: 0.9 });
  bpLine(ctx, cx + w / 2, topY - 8, cx + w / 2 - 10, topY - 8, { thickness: 0.9 });

  // Engagement arrow
  bpArrow(ctx, cx, topY - 14, cx, botY + 14, BP_ACCENT);

  // Bottom clip (wall side) — mirror
  bpLine(ctx, cx - w / 2, botY, cx + w / 2, botY, { thickness: 0.9 });
  bpLine(ctx, cx - w / 2, botY, cx - w / 2, botY + 8, { thickness: 0.9 });
  bpLine(ctx, cx - w / 2, botY + 8, cx - w / 2 + 10, botY + 8, { thickness: 0.9 });

  bpText(ctx, "PANEL-SIDE CLIP", cx - w / 2 - 6, topY + 6, { size: 6.5, color: BP_INK });
  bpText(ctx, "WALL-SIDE CLIP", cx - w / 2 - 4, botY - 12, { size: 6.5, color: BP_INK });
  bpText(ctx, "MONARCH MZA-1.5", cx + w / 2 + 8, (topY + botY) / 2 - 3, { size: 6.5, color: BP_ACCENT });

  const lbl = "MOUNTING HARDWARE";
  const lw = ctx.fonts.bold.widthOfTextAtSize(lbl, 8);
  bpText(ctx, lbl, opts.slotX + opts.slotW / 2 - lw / 2, opts.slotY + 6, {
    font: ctx.fonts.bold, size: 8, color: BP_INK,
  });
  const lbl2 = "BUNDLED PER PANEL";
  const lw2 = ctx.fonts.regular.widthOfTextAtSize(lbl2, 7);
  bpText(ctx, lbl2, opts.slotX + opts.slotW / 2 - lw2 / 2, opts.slotY - 4, {
    font: ctx.fonts.regular, size: 7, color: BP_DIM,
  });
}

/** Rear view of a panel with horizontal Z-clip strips drawn at their actual positions. */
function drawPanelRearViewWithClips(ctx: BpDrawCtx, opts: {
  slotX: number; slotY: number; slotW: number; slotH: number;
  panelLengthIn: number; panelHeightIn: number; clipPairs: number;
}): void {
  const PAD_L = 16, PAD_R = 28, PAD_T = 14, PAD_B = 30;
  const drawW = opts.slotW - PAD_L - PAD_R;
  const drawH = opts.slotH - PAD_T - PAD_B;
  const scale = Math.min(drawW / opts.panelLengthIn, drawH / opts.panelHeightIn);
  const w = opts.panelLengthIn * scale, h = opts.panelHeightIn * scale;
  const x = opts.slotX + PAD_L + (drawW - w) / 2;
  const y = opts.slotY + PAD_B + (drawH - h) / 2;

  // Panel back outline
  bpRect(ctx, x, y, w, h, { thickness: 0.8 });

  // Distribute clipPairs evenly along the LENGTH (horizontal). Each clip is
  // drawn as a thin horizontal bar with 4 small circles for screws.
  const inset = 4 * scale; // 4" from each end
  const usable = w - 2 * inset;
  const clipW = Math.min(usable / opts.clipPairs * 0.85, usable);
  const stepX = (w - clipW) / Math.max(1, opts.clipPairs - 1);
  const clipY = y + h / 2 - 3; // centered vertically
  const clipH = 6;
  for (let i = 0; i < opts.clipPairs; i++) {
    const cx = opts.clipPairs === 1 ? x + (w - clipW) / 2 : x + i * stepX;
    bpRect(ctx, cx, clipY, clipW, clipH, { thickness: 0.5, color: BP_ACCENT });
    // 4 screw holes per clip
    for (let s = 0; s < 4; s++) {
      const sx = cx + (clipW / 5) * (s + 1);
      ctx.page.drawCircle({ x: sx, y: clipY + clipH / 2, size: 0.8, borderColor: BP_INK, borderWidth: 0.4 });
    }
  }

  // Annotation
  const note = `${opts.clipPairs} x Z-CLIP — Monarch MZA-1.5  (8 in long)`;
  const nw = ctx.fonts.regular.widthOfTextAtSize(note, 6.5);
  bpText(ctx, note, x + w / 2 - nw / 2, clipY - 10, { size: 6.5, color: BP_ACCENT });

  bpHDim(ctx, x, x + w, y - 14, `${fmtDim(opts.panelLengthIn)}"`);
  bpVDim(ctx, y, y + h, x + w + 6, `${fmtDim(opts.panelHeightIn)}"`);

  const lbl = "REAR VIEW — CLIP LAYOUT";
  const lw = ctx.fonts.bold.widthOfTextAtSize(lbl, 8);
  bpText(ctx, lbl, opts.slotX + opts.slotW / 2 - lw / 2, opts.slotY + 6, {
    font: ctx.fonts.bold, size: 8, color: BP_INK,
  });
}

type BlueprintInputs = {
  outerL: number | null;
  outerW: number | null;
  outerH: number | null;
  innerL: number | null;
  innerW: number | null;
  innerD: number | null;
  drainDiameter: number | null;
  clipPairs: number;
};

/**
 * Renders the procedural blueprint page. Cobalt-blue background, 6-panel
 * layout, white-line drawings with perfect text — all pdf-lib, no AI.
 *
 * Returns true if the page was drawn (skipped only when outer dims missing).
 */
function renderProceduralBlueprintPage(
  pdf: PDFDocument,
  fonts: Fonts,
  logo: PDFImage | null,
  sku: { code: string; name: string; category: string; finish: string; type?: string | null },
  inputs: BlueprintInputs,
  meta: { productUrl: string },
): boolean {
  if (inputs.outerL === null || inputs.outerW === null || inputs.outerH === null) {
    return false;
  }

  const PAGE_W = 612, PAGE_H = 792, M = 36;
  const HEADER_H = 56, FOOTER_H = 30;

  const page = pdf.addPage([PAGE_W, PAGE_H]);
  const ctx: BpDrawCtx = { page, fonts };

  // Cobalt full-bleed background
  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: BP_BG });

  // Faint grid in the content area
  drawBlueprintGrid(ctx, M, FOOTER_H + 6, PAGE_W - 2 * M, PAGE_H - HEADER_H - FOOTER_H - 12);

  // ── Dark header band (matches other pages, but white type for cobalt) ──
  page.drawRectangle({ x: 0, y: PAGE_H - HEADER_H, width: PAGE_W, height: HEADER_H, color: rgb(0, 0, 0) });
  if (logo) {
    const logoH = 28;
    const ratio = logoH / logo.height;
    const logoW = logo.width * ratio;
    page.drawImage(logo, { x: M, y: PAGE_H - HEADER_H + (HEADER_H - logoH) / 2, width: logoW, height: logoH });
  } else {
    bpText(ctx, "BACKUS DESIGN CO", M, PAGE_H - HEADER_H / 2 - 4, { font: fonts.bold, size: 13, color: BP_INK });
  }
  const headerRight = "MANUFACTURING BLUEPRINT";
  const hw = fonts.bold.widthOfTextAtSize(headerRight, 11);
  bpText(ctx, headerRight, PAGE_W - M - hw, PAGE_H - HEADER_H / 2 + 2, { font: fonts.bold, size: 11, color: BP_INK });
  const subtitle = `${sku.code} · ${sku.name}`;
  const sw = fonts.regular.widthOfTextAtSize(subtitle, 8);
  bpText(ctx, subtitle, PAGE_W - M - sw, PAGE_H - HEADER_H / 2 - 12, {
    font: fonts.regular, size: 8, color: rgb(0.7, 0.74, 0.78),
  });

  // ── Title block (top-left) ──
  const TITLE_X = M, TITLE_Y = PAGE_H - HEADER_H - 16, TITLE_W = 220, TITLE_H = 130;
  bpRect(ctx, TITLE_X, TITLE_Y - TITLE_H, TITLE_W, TITLE_H, { thickness: 0.8 });

  let ty = TITLE_Y - 16;
  bpText(ctx, sku.name.toUpperCase(), TITLE_X + 10, ty, { font: fonts.bold, size: 11, color: BP_INK });
  ty -= 14;
  bpText(ctx, (sku.type || sku.category).toUpperCase(), TITLE_X + 10, ty, { size: 7, color: BP_DIM });
  ty -= 16;

  const titleRows: [string, string][] = [
    ["LENGTH:", `${fmtDim(inputs.outerL)} in`],
    ["WIDTH:", `${fmtDim(inputs.outerW)} in`],
    [sku.category === "PANEL" || sku.category === "WALL_TILE" ? "DEPTH:" : "HEIGHT:", `${fmtDim(inputs.outerH)} in`],
    ["MATERIAL:", "GFRC"],
  ];
  if (sku.category === "PANEL") {
    titleRows.push(["MOUNT:", `Z-CLIP (${inputs.clipPairs} PAIRS)`]);
  } else if (sku.category === "VESSEL_SINK" && inputs.drainDiameter) {
    titleRows.push(["DRAIN:", `${fmtDim(inputs.drainDiameter)} in ROUND`]);
  }
  for (const [k, v] of titleRows) {
    bpText(ctx, k, TITLE_X + 10, ty, { size: 8, color: BP_DIM });
    bpText(ctx, v, TITLE_X + 78, ty, { size: 8.5, color: BP_INK });
    ty -= 12;
  }

  // ── Notes block (bottom-right) ──
  const NOTES_W = 200, NOTES_H = 120;
  const NOTES_X = PAGE_W - M - NOTES_W, NOTES_Y = FOOTER_H + 8 + NOTES_H;
  bpRect(ctx, NOTES_X, NOTES_Y - NOTES_H, NOTES_W, NOTES_H, { thickness: 0.8 });

  let ny = NOTES_Y - 16;
  bpText(ctx, "NOTES", NOTES_X + 10, ny, { font: fonts.bold, size: 8, color: BP_INK });
  ny -= 14;
  const noteLines: string[] = [
    "All dimensions in inches.",
    "Tolerance: +/- 0.04 in",
    "Hand-cast pieces vary +/- 1/8 in.",
    "GFRC construction, sealed.",
  ];
  if (sku.category === "PANEL") {
    noteLines.push(
      `Mount: Z-Clip, ${inputs.clipPairs} pairs bundled.`,
      "Load: 100 lb / linear ft",
      "Wall: 16 in O.C. studs.",
    );
  } else if (sku.category === "VESSEL_SINK") {
    noteLines.push("Wall-mount: 4x 1/4-20 SS studs.", "Drain: standard 1.5 in tailpiece.");
  }
  for (const l of noteLines) {
    bpText(ctx, "- " + l, NOTES_X + 10, ny, { size: 7, color: BP_INK });
    ny -= 10;
  }

  // SKU brand mark — sits inside the notes block to avoid the page footer.
  // (No separate "BACKUS DESIGN CO." text — the header logo + page footer
  // already carry the brand twice.)
  bpText(ctx, sku.code, NOTES_X + NOTES_W - 60, NOTES_Y - NOTES_H + 6, {
    font: fonts.bold, size: 8, color: BP_ACCENT,
  });

  // ── Drawing area (right of title block, above notes) ──
  const VIEWS_X = TITLE_X + TITLE_W + 16;
  const VIEWS_Y_TOP = TITLE_Y;
  const VIEWS_X_END = PAGE_W - M;
  const VIEWS_Y_BOT = NOTES_Y + 8; // gap above notes

  const VIEWS_W = VIEWS_X_END - VIEWS_X;
  const VIEWS_H = VIEWS_Y_TOP - VIEWS_Y_BOT;

  // Two-row layout in the views area:
  //   Row 1 (top): primary view (full width)
  //   Row 2 (mid): two side-by-side
  //   Bottom area (full width below title): big section + 2 small details
  // For PANEL: face view, rear view, side edge, big section A-A, surface, hardware
  // For others: top view, front, side, section A-A, drain/edge, contour/base

  // Row 1 — primary view (full width across the views area)
  const ROW1_H = VIEWS_H * 0.45;
  const row1Slot = { slotX: VIEWS_X, slotY: VIEWS_Y_TOP - ROW1_H, slotW: VIEWS_W, slotH: ROW1_H };

  // Row 2 — two views side by side
  const ROW2_GAP = 10;
  const ROW2_H = VIEWS_H * 0.55 - 4;
  const ROW2_Y = VIEWS_Y_TOP - ROW1_H - 4;
  const ROW2_SLOT_W = (VIEWS_W - ROW2_GAP) / 2;
  const row2aSlot = { slotX: VIEWS_X, slotY: ROW2_Y - ROW2_H, slotW: ROW2_SLOT_W, slotH: ROW2_H };
  const row2bSlot = { slotX: VIEWS_X + ROW2_SLOT_W + ROW2_GAP, slotY: ROW2_Y - ROW2_H, slotW: ROW2_SLOT_W, slotH: ROW2_H };

  // Section row (full width, below the views area, above notes — left of notes)
  const SECTION_X = M;
  const SECTION_W = NOTES_X - M - 12;
  const SECTION_H = NOTES_H - 4;
  const sectionSlot = { slotX: SECTION_X, slotY: NOTES_Y - NOTES_H, slotW: SECTION_W, slotH: SECTION_H };

  // ── Category-specific view layout ──
  if (sku.category === "PANEL") {
    // Row 1: FACE VIEW
    bpOrthoView(ctx, {
      ...row1Slot,
      label: "FACE VIEW",
      objW: inputs.outerL!,
      objH: inputs.outerW!,
    });
    // Tiny visual hint of relief — horizontal lines across face
    {
      const PAD_L = 14, PAD_R = 28, PAD_T = 14, PAD_B = 30;
      const drawW = row1Slot.slotW - PAD_L - PAD_R;
      const drawH = row1Slot.slotH - PAD_T - PAD_B;
      const scale = Math.min(drawW / inputs.outerL!, drawH / inputs.outerW!);
      const w2 = inputs.outerL! * scale, h2 = inputs.outerW! * scale;
      const x2 = row1Slot.slotX + PAD_L + (drawW - w2) / 2;
      const y2 = row1Slot.slotY + PAD_B + (drawH - h2) / 2;
      for (let i = 1; i < 8; i++) {
        const ly = y2 + (h2 / 8) * i;
        bpLine(ctx, x2 + 4, ly, x2 + w2 - 4, ly, { thickness: 0.3, color: BP_DIM });
      }
    }

    // Row 2A: REAR VIEW with clip layout
    drawPanelRearViewWithClips(ctx, {
      ...row2aSlot,
      panelLengthIn: inputs.outerL!,
      panelHeightIn: inputs.outerW!,
      clipPairs: inputs.clipPairs,
    });

    // Row 2B: SIDE EDGE
    bpOrthoView(ctx, {
      ...row2bSlot,
      label: "SIDE EDGE",
      objW: inputs.outerH!,
      objH: inputs.outerW!,
    });

    // Section A-A: Z-clip detail (large)
    drawZClipSectionDetail(ctx, sectionSlot);
  } else if (sku.category === "VESSEL_SINK") {
    bpOrthoView(ctx, {
      ...row1Slot,
      label: "TOP VIEW",
      objW: inputs.outerL!,
      objH: inputs.outerW!,
      innerW: inputs.innerL,
      innerH: inputs.innerW,
      drainCircle: inputs.drainDiameter ? { diameter: inputs.drainDiameter } : null,
    });
    bpOrthoView(ctx, {
      ...row2aSlot,
      label: "FRONT ELEVATION",
      objW: inputs.outerL!,
      objH: inputs.outerH!,
      innerW: inputs.innerL,
      innerH: inputs.innerD,
    });
    bpOrthoView(ctx, {
      ...row2bSlot,
      label: "SIDE ELEVATION",
      objW: inputs.outerW!,
      objH: inputs.outerH!,
      innerW: inputs.innerW,
      innerH: inputs.innerD,
    });
    // Section
    bpOrthoView(ctx, {
      ...sectionSlot,
      label: "SECTION A-A — BASIN PROFILE",
      objW: inputs.outerL!,
      objH: inputs.outerH!,
      innerW: inputs.innerL,
      innerH: inputs.innerD,
    });
  } else {
    // FURNITURE / HARD_GOOD / WALL_TILE / default
    bpOrthoView(ctx, {
      ...row1Slot,
      label: "TOP VIEW",
      objW: inputs.outerL!,
      objH: inputs.outerW!,
      innerW: inputs.innerL,
      innerH: inputs.innerW,
    });
    bpOrthoView(ctx, {
      ...row2aSlot,
      label: "FRONT ELEVATION",
      objW: inputs.outerL!,
      objH: inputs.outerH!,
    });
    bpOrthoView(ctx, {
      ...row2bSlot,
      label: "SIDE ELEVATION",
      objW: inputs.outerW!,
      objH: inputs.outerH!,
    });
    bpOrthoView(ctx, {
      ...sectionSlot,
      label: "SECTION A-A",
      objW: inputs.outerL!,
      objH: inputs.outerH!,
      innerW: inputs.innerL,
      innerH: inputs.innerD,
    });
  }

  // (No exploded-clip inset on this page — the install guide on
  // page 4 is the mounting reference. Page 3 stays purely technical.)

  // ── Footer ──
  bpLine(ctx, M, FOOTER_H + 18, PAGE_W - M, FOOTER_H + 18, { thickness: 0.4, color: BP_DIM });
  const footer = `${meta.productUrl}   ·   trade@backusdesignco.com   ·   Page 3 — Manufacturing Blueprint`;
  const fw = fonts.regular.widthOfTextAtSize(footer, 7);
  bpText(ctx, footer, (PAGE_W - fw) / 2, FOOTER_H + 4, { size: 7, color: BP_DIM });

  return true;
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

  // (Page 3 is now drawn procedurally in pdf-lib — see
  // renderProceduralBlueprintPage. We no longer fetch the
  // BLUEPRINT_RENDER asset to avoid a wasted DB query and a heavy
  // unused PNG embed in the output PDF.)
  const _findBlueprintRenderBytes_kept_for_future_use = findBlueprintRenderBytes;
  void _findBlueprintRenderBytes_kept_for_future_use;

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

  // Hero block — image fills its panel with no negative space.
  // Panel dims = image draw dims, centered horizontally on the page.
  // Width capped at full content width; height capped at HERO_MAX_H so
  // the rest of page 1 has room.
  const HERO_PANEL_MAX_W = PAGE_W - 2 * M;
  const HERO_MAX_H = 320;
  const HERO_MIN_H = 200;

  let heroPanelW: number;
  let heroPanelH: number;
  let heroDrawW = HERO_PANEL_MAX_W;
  let heroDrawH = HERO_MAX_H;

  if (hero) {
    const widthFitH = (hero.height / hero.width) * HERO_PANEL_MAX_W;
    if (widthFitH <= HERO_MAX_H) {
      // Wide image: fill width.
      heroDrawW = HERO_PANEL_MAX_W;
      heroDrawH = widthFitH;
    } else {
      // Tall/square image: height-fit, panel narrows to image width.
      heroDrawH = HERO_MAX_H;
      heroDrawW = (hero.width / hero.height) * HERO_MAX_H;
    }
    heroPanelW = heroDrawW;
    heroPanelH = Math.max(HERO_MIN_H, heroDrawH);
  } else {
    heroPanelW = HERO_PANEL_MAX_W;
    heroPanelH = 240;
  }

  const heroPanelX = M + (HERO_PANEL_MAX_W - heroPanelW) / 2;
  const heroAreaBottom = y - heroPanelH;

  // Background — cream only when there's no real photo (so wireframe
  // placeholder still has its frame). With a real photo the panel
  // dims = image dims, so the image covers it 1:1.
  if (!hero) {
    page.drawRectangle({
      x: heroPanelX, y: heroAreaBottom,
      width: heroPanelW, height: heroPanelH, color: CREAM,
    });
  }

  if (hero) {
    page.drawImage(hero, {
      x: heroPanelX, y: heroAreaBottom,
      width: heroDrawW, height: heroDrawH,
    });
  } else if (hasOuterDims) {
    const cx = heroPanelX + heroPanelW / 2 - 30;
    const cy = heroAreaBottom + heroPanelH / 2 - 60;
    drawWireframeIso(page, cx, cy, outerL!, outerW!, outerH!,
      innerL && innerW && innerD ? { l: innerL, w: innerW, d: innerD } : null,
      Math.min(heroPanelW - 32, heroPanelH - 32),
    );
    drawText(page, "Geometric reference — photography in production",
      heroPanelX + 16, heroAreaBottom + 14, { font: fonts.italic, size: 8, color: SUBTLE });
  } else {
    drawText(page, "Photography in production",
      heroPanelX + 16, heroAreaBottom + heroPanelH / 2, { font: fonts.italic, size: 10, color: SUBTLE });
  }

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

  // ── PAGE 3 — Manufacturing Blueprint (procedural; no AI) ──
  // Cobalt-blue background with white-line drawings rendered entirely
  // in pdf-lib. Replaces the previous gpt-image-1 embed which couldn't
  // render technical text without typos. Text here is real PDF text —
  // perfect spelling every time.
  const clipPairsForBlueprint = sku.category === "PANEL" && outerL !== null
    ? Math.max(2, Math.ceil(outerL / 24))
    : 0;
  renderProceduralBlueprintPage(
    pdf,
    fonts,
    logo,
    {
      code: sku.code,
      name: sku.name,
      category: sku.category,
      finish: sku.finish,
      type: null,
    },
    {
      outerL, outerW, outerH,
      innerL, innerW, innerD,
      drainDiameter: sku.category === "VESSEL_SINK" ? 1.75 : null,
      clipPairs: clipPairsForBlueprint,
    },
    { productUrl },
  );

  // ── PAGE 4 — Mounting Install Guide (panel SKUs with Z-clip) ──
  if (sku.category === "PANEL" && hasOuterDims) {
    const p4 = pdf.addPage([PAGE_W, PAGE_H]);
    drawHeader(p4, "MOUNTING & INSTALL GUIDE", `${sku.code} · ${sku.name}`);

    let yy = PAGE_H - HEADER_H - 32;
    const clipPairs = Math.max(2, Math.ceil(outerL! / 24));

    // ── System summary box ──
    drawText(p4, "MOUNTING SYSTEM", M, yy, { font: fonts.bold, size: 9, color: ACCENT });
    drawLine(p4, M, yy - 4, PAGE_W - M, yy - 4, { thickness: 0.5, color: LINE });
    yy -= 18;

    p4.drawRectangle({
      x: M, y: yy - 86, width: PAGE_W - 2 * M, height: 86, color: CREAM,
    });
    let by = yy - 14;
    drawText(p4, "Z-Clip / French Cleat — Monarch MZA-1.5\" aluminum extrusion",
      M + 14, by, { font: fonts.bold, size: 11, color: INK });
    by -= 16;
    const sysRows: [string, string][] = [
      ["Bond to panel", "G/Flex epoxy + 4× #10 stainless screws into pre-cast pilot holes"],
      ["Wall attachment", "Wood screws into studs at 16\" o.c. (provided)"],
      ["Load capacity", "100 lb / linear ft"],
      [`Hardware bundled`, `${clipPairs} clip pair${clipPairs === 1 ? "" : "s"} + wall anchors + epoxy packet — included with panel`],
    ];
    for (const [k, v] of sysRows) {
      drawText(p4, k, M + 14, by, { font: fonts.regular, size: 9, color: SUBTLE });
      drawText(p4, v, M + 110, by, { font: fonts.regular, size: 10, color: INK });
      by -= 13;
    }
    yy -= 100;

    // ── Install steps ──
    drawText(p4, "INSTALL STEPS", M, yy, { font: fonts.bold, size: 9, color: ACCENT });
    drawLine(p4, M, yy - 4, PAGE_W - M, yy - 4, { thickness: 0.5, color: LINE });
    yy -= 16;

    const steps: { n: string; title: string; body: string }[] = [
      {
        n: "01",
        title: "Locate studs and mark clip line",
        body: "Find wall studs and chalk a level horizontal line at the desired top edge of the panel. Z-clips mount BELOW this line — measure down by the clip extrusion height (1.5 in) plus your panel-side clip offset.",
      },
      {
        n: "02",
        title: "Attach wall-side clips",
        body: `Screw the wall-side Z-clip extrusion into every available stud at 16 in o.c., level on the chalk line. ${clipPairs > 1 ? `Repeat for each of the ${clipPairs} clip pairs distributed along the panel length.` : ""} Recess fasteners flush to the clip face.`,
      },
      {
        n: "03",
        title: "Bond panel-side clips (if not pre-installed)",
        body: "Some panels ship with the panel-side clip already epoxied. If not, mix G/Flex epoxy and apply to the back of the clip + the panel mount zone. Drive 4× #10 stainless screws into the pre-cast pilot holes for mechanical reinforcement. Cure 24 hours before hanging.",
      },
      {
        n: "04",
        title: "Hang the panel",
        body: "Lift the panel onto the wall clips so each panel-side hook engages its corresponding wall-side hook. The panel will settle 1/16 in into final position. Verify level — fine-adjust by sliding the panel laterally before final seating.",
      },
      {
        n: "05",
        title: "Verify and finish",
        body: "Confirm a 1/16 in panel-to-wall clearance along the bottom edge. For permanent installs, apply a bead of color-matched silicone along the bottom edge. For removable installs, leave un-sealed.",
      },
    ];

    for (const s of steps) {
      drawText(p4, s.n, M, yy, { font: fonts.bold, size: 12, color: ACCENT });
      drawText(p4, s.title, M + 26, yy, { font: fonts.bold, size: 10, color: INK });
      yy -= 12;
      for (const line of wrapText(s.body, fonts.regular, 9, PAGE_W - 2 * M - 26)) {
        drawText(p4, line, M + 26, yy, { font: fonts.regular, size: 9, color: INK });
        yy -= 11;
      }
      yy -= 4;
    }

    // ── Substrate notes ──
    yy -= 8;
    drawText(p4, "SUBSTRATE & WEIGHT NOTES", M, yy, { font: fonts.bold, size: 9, color: ACCENT });
    drawLine(p4, M, yy - 4, PAGE_W - M, yy - 4, { thickness: 0.5, color: LINE });
    yy -= 16;
    const notes = [
      "Approved substrates: wood-stud framing, metal-stud framing, solid masonry (with appropriate anchors).",
      "Drywall-only mounting is NOT supported — wall clips MUST land on studs.",
      "For sloped or specialty walls, contact trade@backusdesignco.com before install.",
    ];
    for (const n of notes) {
      for (const line of wrapText("·  " + n, fonts.regular, 9, PAGE_W - 2 * M)) {
        drawText(p4, line, M, yy, { font: fonts.regular, size: 9, color: INK });
        yy -= 11;
      }
      yy -= 2;
    }

    drawLine(p4, M, footerY + 14, PAGE_W - M, footerY + 14, { thickness: 0.5, color: LINE });
    const f4 = `${productUrl}   ·   trade@backusdesignco.com   ·   Page 4 — Mounting & Install Guide`;
    const f4W = fonts.regular.widthOfTextAtSize(f4, 8);
    drawText(p4, f4, (PAGE_W - f4W) / 2, footerY, { font: fonts.regular, size: 8, color: SUBTLE });
  }

  const pdfBytes = await pdf.save();
  return {
    filename: `${sku.code}-trade-spec-sheet.pdf`,
    content: Buffer.from(pdfBytes),
  };
}
