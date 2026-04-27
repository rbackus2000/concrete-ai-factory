import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";

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
  // Storefront slug used to build the QR URL.
  slug: string;
};

const STOREFRONT_BASE = "https://backusdesignco.com/shop/care-kits/";

export function qrUrlFor(spec: LabelSpec): string {
  return `${STOREFRONT_BASE}${spec.slug}`;
}

// Brand palette — matches storefront CSS vars.
const INK = rgb(0.10, 0.10, 0.10);
const INK_2 = rgb(0.23, 0.22, 0.21);
const MUTED = rgb(0.42, 0.41, 0.37);
const PAPER = rgb(0.949, 0.937, 0.914);

// US Letter dimensions in points (72pt = 1 inch).
const PAGE_W = 612;
const PAGE_H = 792;
const INCH = 72;

// Avery 5163: 2" x 4", 10 per US Letter sheet.
const SHEET_LABEL_W = 4 * INCH;
const SHEET_LABEL_H = 2 * INCH;
const SHEET_COLS = 2;
const SHEET_ROWS = 5;
const SHEET_LEFT_MARGIN = 0.156 * INCH;
const SHEET_TOP_MARGIN = 0.5 * INCH;
const SHEET_COL_GAP = 0.125 * INCH;

// Single-label proof page sizes.
const SINGLE_LABEL_W = 3 * INCH;
const SINGLE_LABEL_H = 4 * INCH;
const ROUND_LABEL_DIA = 2.5 * INCH;

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
    ingredients:
      "Plant-derived surfactants, distilled water, citrate buffer, food-grade preservative. pH 6.8-7.2. Biodegradable.",
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
    ingredients:
      "Reactive silane / siloxane penetrating sealer with matte additive. VOC compliant. Wear gloves.",
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
    ingredients:
      "Color-matched GFRC blend: portland cement, fine silica, polymer, glass fiber, oxide pigments. Made to order — 90 day shelf life.",
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

// ── Drawing primitives ──

type Page = ReturnType<PDFDocument["addPage"]>;
type Fonts = { serif: Awaited<ReturnType<PDFDocument["embedFont"]>>; serifBold: Awaited<ReturnType<PDFDocument["embedFont"]>>; serifItalic: Awaited<ReturnType<PDFDocument["embedFont"]>>; mono: Awaited<ReturnType<PDFDocument["embedFont"]>>; sansBold: Awaited<ReturnType<PDFDocument["embedFont"]>> };

function wrapText(text: string, maxWidth: number, font: Fonts["serif"], size: number): string[] {
  if (!text) return [""];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawCenteredText(page: Page, text: string, cx: number, y: number, font: Fonts["serif"], size: number, color = INK) {
  const w = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: cx - w / 2, y, size, font, color });
}

async function drawQrAt(pdfDoc: PDFDocument, page: Page, x: number, y: number, size: number, url: string) {
  // Generate QR as PNG buffer, embed.
  const png = await QRCode.toBuffer(url, {
    errorCorrectionLevel: "M",
    margin: 0,
    width: 256,
    color: { dark: "#1a1a1aff", light: "#f2efe9ff" },
  });
  const image = await pdfDoc.embedPng(png);
  page.drawImage(image, { x, y, width: size, height: size });
}

function drawRectFront(page: Page, x: number, y: number, w: number, h: number, fonts: Fonts, label: LabelSpec) {
  // Background + border
  page.drawRectangle({ x, y, width: w, height: h, color: PAPER, borderColor: MUTED, borderWidth: 0.4 });

  // Wordmark
  drawCenteredText(page, "BACKUSDESIGNCO.", x + w / 2, y + h - 16, fonts.serifBold, 9);
  drawCenteredText(page, "architectural concrete, cast by hand", x + w / 2, y + h - 26, fonts.serifItalic, 6.5, MUTED);

  // Top hairline
  const ruleInset = 0.4 * INCH;
  page.drawLine({ start: { x: x + ruleInset, y: y + h - 33 }, end: { x: x + w - ruleInset, y: y + h - 33 }, thickness: 0.35, color: INK });

  // Product name (wrapped)
  const nameLines = wrapText(label.name, w - 0.4 * INCH, fonts.serif, 14);
  const lineHeight = 17;
  const nameBlockH = lineHeight * nameLines.length;
  const nameTop = y + h / 2 + nameBlockH / 2 - 4;
  nameLines.forEach((line, i) => {
    drawCenteredText(page, line, x + w / 2, nameTop - i * lineHeight, fonts.serif, 14);
  });

  // Tagline
  const tagY = nameTop - nameBlockH - 4;
  const tagLines = wrapText(label.tagline, w - 0.5 * INCH, fonts.serifItalic, 7.5);
  tagLines.forEach((line, i) => {
    drawCenteredText(page, line, x + w / 2, tagY - i * 10, fonts.serifItalic, 7.5, INK_2);
  });

  // Bottom hairline
  page.drawLine({ start: { x: x + ruleInset, y: y + 30 }, end: { x: x + w - ruleInset, y: y + 30 }, thickness: 0.35, color: INK });

  // SKU + size mono
  drawCenteredText(page, `${label.sku}   ·   ${label.size}`, x + w / 2, y + 18, fonts.mono, 6.5);
}

function drawRoundFront(page: Page, cx: number, cy: number, dia: number, fonts: Fonts, label: LabelSpec) {
  const r = dia / 2;
  page.drawCircle({ x: cx, y: cy, size: r, color: PAPER, borderColor: MUTED, borderWidth: 0.4 });

  drawCenteredText(page, "BACKUSDESIGNCO.", cx, cy + r - 22, fonts.serifBold, 8);

  // Product name (wrapped)
  const nameLines = wrapText(label.name, dia - 0.35 * INCH, fonts.serif, 12);
  const nameTop = cy + 13 + (nameLines.length - 1) * 7;
  nameLines.forEach((line, i) => {
    drawCenteredText(page, line, cx, nameTop - i * 14, fonts.serif, 12);
  });

  // Tagline
  const tagY = nameTop - nameLines.length * 14 - 4;
  const tagLines = wrapText(label.tagline, dia - 0.5 * INCH, fonts.serifItalic, 6.5);
  tagLines.forEach((line, i) => {
    drawCenteredText(page, line, cx, tagY - i * 9, fonts.serifItalic, 6.5, INK_2);
  });

  // Hairline divider
  page.drawLine({
    start: { x: cx - r + 22, y: cy - r + 30 },
    end: { x: cx + r - 22, y: cy - r + 30 },
    thickness: 0.3,
    color: INK,
  });

  drawCenteredText(page, `${label.sku}  ·  ${label.size}`, cx, cy - r + 18, fonts.mono, 5.5);
}

async function drawRectBack(pdfDoc: PDFDocument, page: Page, x: number, y: number, w: number, h: number, fonts: Fonts, label: LabelSpec) {
  page.drawRectangle({ x, y, width: w, height: h, color: PAPER, borderColor: MUTED, borderWidth: 0.4 });

  const pad = 0.22 * INCH;
  const innerW = w - 2 * pad;
  let cursorY = y + h - pad;

  // SKU + size header
  page.drawText(`${label.sku}   ·   ${label.size}`, {
    x: x + pad,
    y: cursorY - 7,
    size: 6,
    font: fonts.mono,
    color: INK,
  });
  cursorY -= 14;

  page.drawLine({
    start: { x: x + pad, y: cursorY },
    end: { x: x + w - pad, y: cursorY },
    thickness: 0.3,
    color: INK,
  });
  cursorY -= 12;

  // USAGE header
  page.drawText("USAGE", {
    x: x + pad,
    y: cursorY - 6,
    size: 6.5,
    font: fonts.sansBold,
    color: INK,
  });
  cursorY -= 14;

  // Numbered instructions
  for (let i = 0; i < label.instructions.length; i += 1) {
    const step = label.instructions[i];
    const lines = wrapText(`${i + 1}. ${step}`, innerW, fonts.serif, 7.5);
    for (const line of lines) {
      page.drawText(line, { x: x + pad, y: cursorY - 8, size: 7.5, font: fonts.serif, color: INK_2 });
      cursorY -= 10;
    }
    cursorY -= 1;
  }

  // Ingredients
  if (label.ingredients) {
    cursorY -= 4;
    page.drawText("INGREDIENTS", {
      x: x + pad,
      y: cursorY - 6,
      size: 6.5,
      font: fonts.sansBold,
      color: INK,
    });
    cursorY -= 13;
    const ingLines = wrapText(label.ingredients, innerW, fonts.serifItalic, 6.5);
    for (const line of ingLines) {
      page.drawText(line, { x: x + pad, y: cursorY - 7, size: 6.5, font: fonts.serifItalic, color: MUTED });
      cursorY -= 9;
    }
  }

  // Footer
  const footerTop = y + 0.85 * INCH;
  page.drawLine({
    start: { x: x + pad, y: footerTop },
    end: { x: x + w - pad, y: footerTop },
    thickness: 0.3,
    color: INK,
  });

  page.drawText("BACKUSDESIGNCO.", {
    x: x + pad,
    y: footerTop - 12,
    size: 8,
    font: fonts.serifBold,
    color: INK,
  });
  page.drawText("architectural concrete, cast by hand", {
    x: x + pad,
    y: footerTop - 22,
    size: 6,
    font: fonts.serifItalic,
    color: MUTED,
  });
  page.drawText("BACKUSDESIGNCO.COM", {
    x: x + pad,
    y: footerTop - 36,
    size: 6,
    font: fonts.mono,
    color: INK,
  });
  page.drawText("Made by hand in Texas", {
    x: x + pad,
    y: footerTop - 46,
    size: 5.5,
    font: fonts.serifItalic,
    color: MUTED,
  });

  // QR code
  const qrSize = 0.7 * INCH;
  const qrX = x + w - pad - qrSize;
  const qrY = footerTop - qrSize - 4;
  await drawQrAt(pdfDoc, page, qrX, qrY, qrSize, qrUrlFor(label));
}

function drawCropMarks(page: Page, x: number, y: number, w: number, h: number, length = 0.18 * INCH) {
  const pts = [
    { x, y },
    { x: x + w, y },
    { x, y: y + h },
    { x: x + w, y: y + h },
  ];
  for (const p of pts) {
    page.drawLine({ start: { x: p.x - length, y: p.y }, end: p, thickness: 0.3, color: MUTED });
    page.drawLine({ start: p, end: { x: p.x, y: p.y + length }, thickness: 0.3, color: MUTED });
  }
}

async function drawLabelBox(
  pdfDoc: PDFDocument,
  page: Page,
  x: number,
  y: number,
  w: number,
  h: number,
  fonts: Fonts,
  label: LabelSpec,
  side: LabelSide,
) {
  if (side === "back") {
    await drawRectBack(pdfDoc, page, x, y, w, h, fonts, label);
    return;
  }
  if (label.shape === "round") {
    drawRoundFront(page, x + w / 2, y + h / 2, Math.min(w, h), fonts, label);
  } else {
    drawRectFront(page, x, y, w, h, fonts, label);
  }
}

// ── Main entry ──

export async function renderCareLabelsPdf(
  specs: LabelSpec[],
  mode: LabelMode = "single",
  side: LabelSide = "front",
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const fonts: Fonts = {
    serif: await pdfDoc.embedFont(StandardFonts.TimesRoman),
    serifBold: await pdfDoc.embedFont(StandardFonts.TimesRomanBold),
    serifItalic: await pdfDoc.embedFont(StandardFonts.TimesRomanItalic),
    mono: await pdfDoc.embedFont(StandardFonts.CourierBold),
    sansBold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
  };

  for (const label of specs) {
    if (mode === "sheet") {
      const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
      for (let row = 0; row < SHEET_ROWS; row += 1) {
        for (let col = 0; col < SHEET_COLS; col += 1) {
          const x = SHEET_LEFT_MARGIN + col * (SHEET_LABEL_W + SHEET_COL_GAP);
          const y = PAGE_H - SHEET_TOP_MARGIN - (row + 1) * SHEET_LABEL_H;
          await drawLabelBox(pdfDoc, page, x, y, SHEET_LABEL_W, SHEET_LABEL_H, fonts, label, side);
        }
      }
    } else {
      // single proof
      const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
      const isRoundFront = side === "front" && label.shape === "round";
      if (isRoundFront) {
        const cx = PAGE_W / 2;
        const cy = PAGE_H / 2;
        drawRoundFront(page, cx, cy, ROUND_LABEL_DIA, fonts, label);
        drawCropMarks(page, cx - ROUND_LABEL_DIA / 2, cy - ROUND_LABEL_DIA / 2, ROUND_LABEL_DIA, ROUND_LABEL_DIA);
      } else {
        const x = (PAGE_W - SINGLE_LABEL_W) / 2;
        const y = (PAGE_H - SINGLE_LABEL_H) / 2;
        await drawLabelBox(pdfDoc, page, x, y, SINGLE_LABEL_W, SINGLE_LABEL_H, fonts, label, side);
        drawCropMarks(page, x, y, SINGLE_LABEL_W, SINGLE_LABEL_H);
      }
    }
  }

  return pdfDoc.save();
}
