import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import { OutputStatus, OutputType, RecordStatus } from "@prisma/client";

import { prisma } from "@/lib/db";

// ── Trade Spec Sheet (Node-only renderer) ──
// Single-page architect tear sheet generated on-demand from the SKU
// record. Uses pdf-lib so it works on Vercel's serverless runtime
// without Python/reportlab. Regenerates every call so the latest
// pricing and dimensions are always reflected.

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
    case "TILE": return `/tile/${slug}`;
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

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
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

async function fetchImageBytes(url: string): Promise<{ bytes: Uint8Array; format: "png" | "jpg" } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    const ab = await res.arrayBuffer();
    const bytes = new Uint8Array(ab);
    if (ct.includes("png") || url.toLowerCase().endsWith(".png")) return { bytes, format: "png" };
    if (ct.includes("jpeg") || ct.includes("jpg") || /\.jpe?g$/i.test(url)) return { bytes, format: "jpg" };
    // Sniff the magic bytes
    if (bytes[0] === 0x89 && bytes[1] === 0x50) return { bytes, format: "png" };
    if (bytes[0] === 0xff && bytes[1] === 0xd8) return { bytes, format: "jpg" };
    return null;
  } catch {
    return null;
  }
}

// ── pdf-lib helpers ──

const INK = rgb(0.06, 0.09, 0.16);     // #0f172a
const SUBTLE = rgb(0.28, 0.33, 0.41);  // #475569
const LINE = rgb(0.79, 0.83, 0.88);    // #cbd5e1
const ACCENT = rgb(0.65, 0.42, 0.25);  // #a76a3f

type DrawCtx = {
  page: PDFPage;
  font: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
};

function drawText(ctx: DrawCtx, text: string, x: number, y: number, opts: {
  font?: PDFFont;
  size?: number;
  color?: ReturnType<typeof rgb>;
}) {
  ctx.page.drawText(text, {
    x,
    y,
    size: opts.size ?? 10,
    font: opts.font ?? ctx.font,
    color: opts.color ?? INK,
  });
}

function drawLine(page: PDFPage, x1: number, y1: number, x2: number, y2: number, opts?: { thickness?: number; color?: ReturnType<typeof rgb> }) {
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

  const retail = decimalToNumber(sku.retailPrice);
  const trade =
    retail !== null
      ? Math.round(retail * (1 - input.tradeDiscountPct / 100) * 100) / 100
      : null;

  const palette = pickColorPalette(sku.name, sku.finish);
  const leadTime = LEAD_TIME_BY_CATEGORY[sku.category] ?? "Lead time available on request";
  const categoryLabel = CATEGORY_LABEL[sku.category] ?? sku.category;
  const productUrl = `https://backusdesignco.com${pickProductPath(sku.category, sku.slug)}`;
  const today = new Date();
  const validThrough = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

  const heroUrl = await findHeroImageUrl(sku.id);
  const heroImage = heroUrl ? await fetchImageBytes(heroUrl) : null;

  // ── Build the PDF ──
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]); // US Letter portrait
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);
  const ctx: DrawCtx = { page, font, bold, italic };

  const PAGE_W = 612;
  const PAGE_H = 792;
  const M = 48;                 // margin
  let y = PAGE_H - M;           // running y cursor (top-down draw)

  // ── Header bar ──
  drawText(ctx, "BACKUS DESIGN CO  ·  Trade Spec Sheet", M, y - 10, { font: bold, size: 10, color: INK });
  const generatedLabel = `Generated ${isoDate(today)}`;
  const genWidth = font.widthOfTextAtSize(generatedLabel, 8);
  drawText(ctx, generatedLabel, PAGE_W - M - genWidth, y - 10, { size: 8, color: SUBTLE });
  y -= 20;
  drawLine(page, M, y, PAGE_W - M, y);
  y -= 24;

  // ── Title block ──
  drawText(ctx, `${sku.code}  ·  ${categoryLabel}`, M, y, { size: 10, color: ACCENT });
  y -= 26;
  drawText(ctx, sku.name, M, y, { font: bold, size: 22, color: INK });
  y -= 18;
  drawText(ctx, sku.finish || categoryLabel, M, y, { font: italic, size: 11, color: SUBTLE });
  y -= 20;

  // ── Hero image (best effort, optional) ──
  let imageDrawn = false;
  if (heroImage) {
    try {
      const embedded =
        heroImage.format === "png"
          ? await pdf.embedPng(heroImage.bytes)
          : await pdf.embedJpg(heroImage.bytes);
      const targetW = 320;
      const ratio = targetW / embedded.width;
      let drawW = targetW;
      let drawH = embedded.height * ratio;
      if (drawH > 200) {
        const cap = 200 / drawH;
        drawH *= cap;
        drawW *= cap;
      }
      page.drawImage(embedded, { x: M, y: y - drawH, width: drawW, height: drawH });
      y -= drawH + 16;
      imageDrawn = true;
    } catch {
      // bad image bytes — skip
    }
  }
  if (!imageDrawn) y -= 4;

  // ── Two-column body ──
  // Left column: dimensions + finishes. Right column: lead time + pricing.
  const COL_GAP = 28;
  const COL_W = (PAGE_W - 2 * M - COL_GAP) / 2;
  const LEFT_X = M;
  const RIGHT_X = M + COL_W + COL_GAP;
  const bodyTop = y;
  let leftY = bodyTop;
  let rightY = bodyTop;

  // Section heading helper
  const drawSectionHeader = (text: string, x: number, yPos: number) => {
    drawText(ctx, text, x, yPos, { font: bold, size: 8, color: ACCENT });
    return yPos - 14;
  };

  const drawKV = (label: string, value: string, x: number, yPos: number, labelW: number = 70) => {
    drawText(ctx, label, x, yPos, { size: 9, color: SUBTLE });
    drawText(ctx, value, x + labelW, yPos, { size: 10, color: INK });
    return yPos - 14;
  };

  // ── LEFT: DIMENSIONS ──
  leftY = drawSectionHeader("DIMENSIONS", LEFT_X, leftY);

  const outer =
    sku.outerLength !== null
      ? `${fmtNum(decimalToNumber(sku.outerLength))} × ${fmtNum(decimalToNumber(sku.outerWidth))} × ${fmtNum(decimalToNumber(sku.outerHeight))} in`
      : null;
  if (outer) leftY = drawKV("Outer", outer, LEFT_X, leftY);

  const inner =
    sku.innerLength !== null
      ? `${fmtNum(decimalToNumber(sku.innerLength))} × ${fmtNum(decimalToNumber(sku.innerWidth))} × ${fmtNum(decimalToNumber(sku.innerDepth))} in`
      : null;
  if (inner) {
    const innerLabel = sku.category === "VESSEL_SINK" ? "Basin" : "Inner";
    leftY = drawKV(innerLabel, inner, LEFT_X, leftY);
  }

  const wMin = decimalToNumber(sku.targetWeightMinLbs);
  const wMax = decimalToNumber(sku.targetWeightMaxLbs);
  if (wMin !== null && wMax !== null && wMin !== wMax) {
    leftY = drawKV("Weight", `${fmtNum(wMin)}–${fmtNum(wMax)} lbs`, LEFT_X, leftY);
  } else if (wMin !== null) {
    leftY = drawKV("Weight", `${fmtNum(wMin)} lbs`, LEFT_X, leftY);
  }

  if (!outer && !inner && wMin === null) {
    leftY = drawKV("", "Available on request", LEFT_X, leftY, 0);
  }

  // ── LEFT: FINISHES ──
  leftY -= 8;
  leftY = drawSectionHeader("FINISHES", LEFT_X, leftY);
  drawText(ctx, `${palette.family} palette (${palette.colors.length} colors):`, LEFT_X, leftY, { font: bold, size: 10, color: INK });
  leftY -= 13;
  // Wrap colors line to the column width
  const colorLine = palette.colors.join("  ·  ");
  const colorLines = wrapText(colorLine, font, 10, COL_W);
  for (const line of colorLines) {
    drawText(ctx, line, LEFT_X, leftY, { size: 10, color: INK });
    leftY -= 13;
  }
  leftY -= 4;
  drawText(ctx, "Sealer:", LEFT_X, leftY, { font: bold, size: 10, color: INK });
  drawText(ctx, "Food-safe penetrating · 4 finishes", LEFT_X + 38, leftY, { size: 10, color: INK });
  leftY -= 16;

  // ── RIGHT: LEAD TIME ──
  rightY = drawSectionHeader("LEAD TIME", RIGHT_X, rightY);
  const leadLines = wrapText(leadTime, font, 10, COL_W);
  for (const line of leadLines) {
    drawText(ctx, line, RIGHT_X, rightY, { size: 10, color: INK });
    rightY -= 14;
  }
  rightY -= 12;

  // ── RIGHT: TRADE PRICING ──
  rightY = drawSectionHeader(`TRADE PRICING (${input.tradeDiscountPct}% off)`, RIGHT_X, rightY);
  // Price block with line above
  drawLine(page, RIGHT_X, rightY + 4, RIGHT_X + COL_W, rightY + 4, { thickness: 0.5, color: LINE });
  rightY -= 8;
  drawText(ctx, "Retail", RIGHT_X, rightY, { size: 9, color: SUBTLE });
  drawText(ctx, fmtMoney(retail), RIGHT_X + 60, rightY, { size: 10, color: SUBTLE });
  rightY -= 18;
  drawText(ctx, "Trade", RIGHT_X, rightY, { size: 9, color: SUBTLE });
  drawText(ctx, fmtMoney(trade), RIGHT_X + 60, rightY, { font: bold, size: 14, color: INK });
  rightY -= 18;
  drawText(ctx, `Pricing valid through ${isoDate(validThrough)}.`, RIGHT_X, rightY, { font: italic, size: 9, color: SUBTLE });
  rightY -= 14;

  // ── Care + warranty (full width) ──
  y = Math.min(leftY, rightY) - 12;
  y = drawSectionHeader("CARE & WARRANTY", LEFT_X, y);
  const careText =
    "Sealed glass-fiber-reinforced concrete (GFRC). Clean with mild soap and water — no abrasives or acids. " +
    "Re-seal every 12–18 months for high-traffic surfaces. Lifetime structural warranty against manufacturing defects.";
  const careLines = wrapText(careText, font, 10, PAGE_W - 2 * M);
  for (const line of careLines) {
    drawText(ctx, line, LEFT_X, y, { size: 10, color: INK });
    y -= 14;
  }

  // ── Footer ──
  const footerY = M + 16;
  drawLine(page, M, footerY + 12, PAGE_W - M, footerY + 12);
  const footer = `${productUrl}  ·  trade@backusdesignco.com`;
  const footerW = font.widthOfTextAtSize(footer, 8);
  drawText(ctx, footer, (PAGE_W - footerW) / 2, footerY, { size: 8, color: SUBTLE });

  const pdfBytes = await pdf.save();
  return {
    filename: `${sku.code}-trade-spec-sheet.pdf`,
    content: Buffer.from(pdfBytes),
  };
}
