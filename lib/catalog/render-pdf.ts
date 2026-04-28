/**
 * Render the catalog as a print-ready PDF.
 *
 * Each product image is wrapped in a clickable hyperlink annotation that
 * points to the live storefront product detail page. Most PDF readers
 * (Adobe, Preview, browser PDF viewers) honor these as native links.
 */

import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";

import type { CatalogProduct, CatalogSpec } from "./compose-spec";

// US Letter portrait, points (72pt = 1in).
const PAGE_W = 612;
const PAGE_H = 792;
const PAD_X = 54; // ~3/4 inch margin
const PAD_TOP = 60;
const PAD_BOTTOM = 60;

// Brand palette
const INK = rgb(0.10, 0.10, 0.10);
const INK_2 = rgb(0.23, 0.22, 0.21);
const MUTED = rgb(0.42, 0.41, 0.37);
const PAPER = rgb(0.949, 0.937, 0.914);
const ACCENT = rgb(0.78, 0.36, 0.20); // accent-rust
const LINE = rgb(0.85, 0.83, 0.80);

type Fonts = {
  serif: PDFFont;
  serifBold: PDFFont;
  serifItalic: PDFFont;
  mono: PDFFont;
  sans: PDFFont;
  sansBold: PDFFont;
};

function wrap(text: string, maxWidth: number, font: PDFFont, size: number): string[] {
  if (!text) return [""];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    const candidate = current ? `${current} ${w}` : w;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) current = candidate;
    else {
      if (current) lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawWrapped(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  font: PDFFont,
  size: number,
  lineHeight: number,
  color = INK_2,
): number {
  const lines = wrap(text, maxWidth, font, size);
  for (const line of lines) {
    page.drawText(line, { x, y, size, font, color });
    y -= lineHeight;
  }
  return y;
}

function drawCenteredText(page: PDFPage, text: string, cx: number, y: number, font: PDFFont, size: number, color = INK) {
  const w = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: cx - w / 2, y, size, font, color });
}

function pageFooter(page: PDFPage, fonts: Fonts, label: string, pageNum: number) {
  page.drawText(label, { x: PAD_X, y: 30, size: 8, font: fonts.mono, color: MUTED });
  const right = `${pageNum}`;
  const rightW = fonts.mono.widthOfTextAtSize(right, 8);
  page.drawText(right, { x: PAGE_W - PAD_X - rightW, y: 30, size: 8, font: fonts.mono, color: MUTED });
}

// Cap image resolution before embedding so the PDF stays a reasonable size.
// Catalog pages display images at ~3-5 inches wide at 144dpi = ~720px max
// effective. 1200px gives some headroom for high-DPI viewing without
// bloating the file.
const MAX_IMAGE_DIMENSION = 1200;
const JPEG_QUALITY = 80;

const imageCache = new Map<string, Uint8Array>();

async function fetchImageBytes(url: string): Promise<Uint8Array | null> {
  if (imageCache.has(url)) return imageCache.get(url)!;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    imageCache.set(url, bytes);
    return bytes;
  } catch {
    return null;
  }
}

async function embedImageSafe(pdfDoc: PDFDocument, url: string) {
  const bytes = await fetchImageBytes(url);
  if (!bytes) return null;

  // Resize + re-encode as JPEG for compact embedding.
  let jpegBytes: Buffer;
  try {
    const sharp = (await import("sharp")).default;
    jpegBytes = await sharp(Buffer.from(bytes))
      .resize({
        width: MAX_IMAGE_DIMENSION,
        height: MAX_IMAGE_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .toBuffer();
  } catch {
    // If sharp fails, fall back to embedding the raw bytes.
    try {
      return await pdfDoc.embedPng(bytes);
    } catch {
      try {
        return await pdfDoc.embedJpg(bytes);
      } catch {
        return null;
      }
    }
  }

  try {
    return await pdfDoc.embedJpg(jpegBytes);
  } catch {
    return null;
  }
}

function addLinkAnnotation(pdfDoc: PDFDocument, page: PDFPage, x: number, y: number, w: number, h: number, url: string) {
  // pdf-lib supports page.doc.context to build native link annotations.
  // We use addAnnotation on the page via its acroform or low-level API.
  const linkRef = pdfDoc.context.register(
    pdfDoc.context.obj({
      Type: "Annot",
      Subtype: "Link",
      Rect: [x, y, x + w, y + h],
      Border: [0, 0, 0],
      A: {
        Type: "Action",
        S: "URI",
        URI: url,
      },
    }),
  );
  const existing = page.node.Annots();
  if (existing) {
    existing.push(linkRef);
  } else {
    page.node.set(pdfDoc.context.obj("Annots"), pdfDoc.context.obj([linkRef]));
  }
}

// ── Page renderers ──

async function renderCover(pdfDoc: PDFDocument, fonts: Fonts, spec: CatalogSpec) {
  const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: PAPER });

  const heroImg = await embedImageSafe(pdfDoc, spec.cover.image);
  if (heroImg) {
    const aspect = heroImg.width / heroImg.height;
    const drawW = PAGE_W;
    const drawH = drawW / aspect;
    page.drawImage(heroImg, {
      x: 0,
      y: PAGE_H - drawH,
      width: drawW,
      height: drawH,
      opacity: 0.55,
    });
  }

  const titleY = PAGE_H / 2;
  for (let i = 0; i < spec.cover.titleLines.length; i += 1) {
    const line = spec.cover.titleLines[i];
    drawCenteredText(page, line, PAGE_W / 2, titleY - i * 60, fonts.serifBold, 56, INK);
  }
  drawCenteredText(page, spec.cover.subtitle, PAGE_W / 2, 120, fonts.serifItalic, 12, MUTED);
  drawCenteredText(page, "BACKUSDESIGNCO.COM", PAGE_W / 2, 60, fonts.mono, 9, INK_2);
}

function renderInsideCover(pdfDoc: PDFDocument, fonts: Fonts, spec: CatalogSpec) {
  const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  const cx = PAGE_W / 2;
  drawCenteredText(page, "BACKUSDESIGNCO.", cx, PAGE_H - 200, fonts.serifBold, 14, INK);
  drawCenteredText(page, "architectural concrete, cast by hand", cx, PAGE_H - 220, fonts.serifItalic, 10, MUTED);
  drawCenteredText(page, `Catalog v${spec.meta.version}  ·  ${new Date(spec.meta.publishedAt).toLocaleDateString("en-US", { year: "numeric", month: "long" })}`, cx, PAGE_H - 240, fonts.mono, 9, MUTED);
  drawCenteredText(page, "© Backus Design Co.", cx, 200, fonts.mono, 8, MUTED);
}

function renderDesignerLetter(pdfDoc: PDFDocument, fonts: Fonts, spec: CatalogSpec, pageNum: number) {
  const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - PAD_TOP;
  page.drawText("01 — A NOTE FROM THE STUDIO", { x: PAD_X, y, size: 9, font: fonts.mono, color: MUTED });
  y -= 36;
  page.drawText(spec.designerLetter.title, { x: PAD_X, y, size: 28, font: fonts.serif, color: INK });
  y -= 38;

  for (const para of spec.designerLetter.paragraphs) {
    y = drawWrapped(page, para, PAD_X, y, PAGE_W - 2 * PAD_X, fonts.serif, 11, 17, INK_2);
    y -= 14;
  }

  y -= 12;
  page.drawText("—", { x: PAD_X, y, size: 12, font: fonts.serif, color: MUTED });
  y -= 18;
  page.drawText(spec.designerLetter.signature, { x: PAD_X, y, size: 11, font: fonts.serifItalic, color: INK });

  pageFooter(page, fonts, "DESIGNER'S LETTER", pageNum);
}

async function renderStudioSpread(pdfDoc: PDFDocument, fonts: Fonts, spec: CatalogSpec, startPage: number) {
  // Page 1 — studio intro + stats
  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - PAD_TOP;
  page.drawText("02 — THE STUDIO", { x: PAD_X, y, size: 9, font: fonts.mono, color: MUTED });
  y -= 36;
  page.drawText("A place where concrete becomes.", { x: PAD_X, y, size: 24, font: fonts.serif, color: INK });
  y -= 32;
  y = drawWrapped(page, spec.studio.intro, PAD_X, y, PAGE_W - 2 * PAD_X, fonts.serif, 11, 17, INK_2);
  y -= 24;

  // Stats row
  const colW = (PAGE_W - 2 * PAD_X) / spec.studio.stats.length;
  for (let i = 0; i < spec.studio.stats.length; i += 1) {
    const stat = spec.studio.stats[i];
    const x = PAD_X + i * colW;
    page.drawText(stat.number, { x, y: y - 30, size: 36, font: fonts.serif, color: INK });
    page.drawText(stat.label.toUpperCase(), { x, y: y - 50, size: 8, font: fonts.mono, color: MUTED });
  }
  y -= 80;

  // Studio image (workshop wide)
  const wideImg = await embedImageSafe(pdfDoc, spec.studio.images[0]);
  if (wideImg) {
    const drawW = PAGE_W - 2 * PAD_X;
    const drawH = (drawW / wideImg.width) * wideImg.height;
    page.drawImage(wideImg, { x: PAD_X, y: y - drawH, width: drawW, height: drawH });
  }
  pageFooter(page, fonts, "THE STUDIO", startPage);

  // Page 2 — process steps (six)
  page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  y = PAGE_H - PAD_TOP;
  page.drawText("THE PROCESS", { x: PAD_X, y, size: 9, font: fonts.mono, color: MUTED });
  y -= 36;
  page.drawText("Six steps. No shortcuts.", { x: PAD_X, y, size: 24, font: fonts.serif, color: INK });
  y -= 32;

  // Two columns of 3 steps each.
  const colWidth = (PAGE_W - 2 * PAD_X - 28) / 2;
  const colTop = y;
  for (let i = 0; i < spec.studio.process.length; i += 1) {
    const step = spec.studio.process[i];
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = PAD_X + col * (colWidth + 28);
    let yPos = colTop - row * 165;
    page.drawText(step.step, { x, y: yPos, size: 22, font: fonts.serif, color: ACCENT });
    yPos -= 18;
    page.drawText(step.title, { x, y: yPos, size: 13, font: fonts.serifBold, color: INK });
    yPos -= 16;
    drawWrapped(page, step.body, x, yPos, colWidth, fonts.serif, 9.5, 13.5, INK_2);
  }
  pageFooter(page, fonts, "THE PROCESS", startPage + 1);

  return startPage + 2;
}

function renderMarket(pdfDoc: PDFDocument, fonts: Fonts, spec: CatalogSpec, pageNum: number): number {
  const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - PAD_TOP;
  page.drawText("03 — INDUSTRY", { x: PAD_X, y, size: 9, font: fonts.mono, color: MUTED });
  y -= 36;
  page.drawText(spec.market.title, { x: PAD_X, y, size: 24, font: fonts.serif, color: INK });
  y -= 32;
  y = drawWrapped(page, spec.market.intro, PAD_X, y, PAGE_W - 2 * PAD_X, fonts.serifItalic, 11, 17, INK_2);
  y -= 18;

  for (const bullet of spec.market.bullets) {
    page.drawText(bullet.headline, { x: PAD_X, y, size: 12, font: fonts.serifBold, color: INK });
    y -= 16;
    y = drawWrapped(page, bullet.body, PAD_X, y, PAGE_W - 2 * PAD_X, fonts.serif, 10, 14, INK_2);
    y -= 16;
  }
  pageFooter(page, fonts, "INDUSTRY · MARKET", pageNum);
  return pageNum + 1;
}

function renderColorGuide(pdfDoc: PDFDocument, fonts: Fonts, spec: CatalogSpec, pageNum: number): number {
  const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - PAD_TOP;
  page.drawText("04 — COLOR", { x: PAD_X, y, size: 9, font: fonts.mono, color: MUTED });
  y -= 36;
  page.drawText("Sixteen studio finishes.", { x: PAD_X, y, size: 24, font: fonts.serif, color: INK });
  y -= 26;
  y = drawWrapped(page, spec.colorGuide.intro, PAD_X, y, PAGE_W - 2 * PAD_X, fonts.serifItalic, 10, 14.5, INK_2);
  y -= 16;

  for (const family of spec.colorGuide.families) {
    page.drawText(family.name.toUpperCase(), { x: PAD_X, y, size: 10, font: fonts.mono, color: ACCENT });
    y -= 14;
    y = drawWrapped(page, family.description, PAD_X, y, PAGE_W - 2 * PAD_X, fonts.serif, 9.5, 13, INK_2);
    y -= 12;

    // Color swatches: 4 per row.
    const swatchW = (PAGE_W - 2 * PAD_X - 24) / 4;
    const swatchH = 60;
    for (let i = 0; i < family.colors.length; i += 1) {
      const c = family.colors[i];
      const col = i % 4;
      const row = Math.floor(i / 4);
      const x = PAD_X + col * (swatchW + 8);
      const yPos = y - row * (swatchH + 38);
      const r = parseInt(c.hex.slice(1, 3), 16) / 255;
      const g = parseInt(c.hex.slice(3, 5), 16) / 255;
      const b = parseInt(c.hex.slice(5, 7), 16) / 255;
      page.drawRectangle({ x, y: yPos - swatchH, width: swatchW, height: swatchH, color: rgb(r, g, b), borderColor: LINE, borderWidth: 0.4 });
      page.drawText(c.name, { x, y: yPos - swatchH - 12, size: 9, font: fonts.serifBold, color: INK });
      page.drawText(c.note, { x, y: yPos - swatchH - 22, size: 7.5, font: fonts.serifItalic, color: MUTED });
    }
    y -= Math.ceil(family.colors.length / 4) * (swatchH + 38) + 14;
  }
  pageFooter(page, fonts, "COLOR GUIDE", pageNum);
  return pageNum + 1;
}

function renderFinishes(pdfDoc: PDFDocument, fonts: Fonts, spec: CatalogSpec, pageNum: number): number {
  const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - PAD_TOP;
  page.drawText("05 — FINISH", { x: PAD_X, y, size: 9, font: fonts.mono, color: MUTED });
  y -= 36;
  page.drawText("Four base finishes.", { x: PAD_X, y, size: 24, font: fonts.serif, color: INK });
  y -= 26;
  y = drawWrapped(page, spec.finishesGuide.intro, PAD_X, y, PAGE_W - 2 * PAD_X, fonts.serifItalic, 10, 14.5, INK_2);
  y -= 24;

  for (const f of spec.finishesGuide.finishes) {
    page.drawText(f.name.toUpperCase(), { x: PAD_X, y, size: 10, font: fonts.mono, color: ACCENT });
    page.drawText(f.tagline, { x: PAD_X + 80, y, size: 11, font: fonts.serifItalic, color: INK_2 });
    y -= 16;
    y = drawWrapped(page, f.body, PAD_X, y, PAGE_W - 2 * PAD_X, fonts.serif, 10, 14, INK_2);
    y -= 16;
  }
  pageFooter(page, fonts, "FINISHES", pageNum);
  return pageNum + 1;
}

async function renderSection(
  pdfDoc: PDFDocument,
  fonts: Fonts,
  spec: CatalogSpec,
  section: CatalogSpec["sections"][number],
  startPage: number,
): Promise<number> {
  // Section divider page
  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: PAPER });
  let y = PAGE_H - 280;
  page.drawText(section.eyebrow.toUpperCase(), { x: PAD_X, y, size: 11, font: fonts.mono, color: MUTED });
  y -= 50;
  page.drawText(section.title + ".", { x: PAD_X, y, size: 64, font: fonts.serif, color: INK });
  y -= 72;
  drawWrapped(page, section.intro, PAD_X, y, PAGE_W - 2 * PAD_X - 80, fonts.serifItalic, 12, 18, INK_2);
  pageFooter(page, fonts, section.title.toUpperCase(), startPage);

  let pageNum = startPage + 1;

  // Product grid pages — 4 products per page in a 2×2 grid
  const PER_PAGE = 4;
  for (let i = 0; i < section.products.length; i += PER_PAGE) {
    const chunk = section.products.slice(i, i + PER_PAGE);
    page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    let yTop = PAGE_H - PAD_TOP;
    page.drawText(`${section.eyebrow.toUpperCase()}  ·  ${i + 1}–${Math.min(i + PER_PAGE, section.products.length)} of ${section.products.length}`, {
      x: PAD_X,
      y: yTop,
      size: 8,
      font: fonts.mono,
      color: MUTED,
    });
    yTop -= 30;

    const cellW = (PAGE_W - 2 * PAD_X - 20) / 2;
    const cellH = (PAGE_H - PAD_TOP - PAD_BOTTOM - 30 - 20) / 2;
    const imgH = cellH - 90;

    for (let j = 0; j < chunk.length; j += 1) {
      const p = chunk[j];
      const col = j % 2;
      const row = Math.floor(j / 2);
      const x = PAD_X + col * (cellW + 20);
      const yCell = yTop - (row + 1) * cellH - row * 20;

      const img = await embedImageSafe(pdfDoc, p.imageUrl);
      if (img) {
        // Fit image inside imgH × cellW, center horizontally.
        const aspect = img.width / img.height;
        let drawW = cellW;
        let drawH = drawW / aspect;
        if (drawH > imgH) {
          drawH = imgH;
          drawW = drawH * aspect;
        }
        const xImg = x + (cellW - drawW) / 2;
        const yImg = yCell + (cellH - drawH) - 90;
        page.drawImage(img, { x: xImg, y: yImg, width: drawW, height: drawH });
        // Hyperlink the image area to the storefront product page.
        addLinkAnnotation(pdfDoc, page, xImg, yImg, drawW, drawH, p.productUrl);
      } else {
        page.drawRectangle({ x, y: yCell + cellH - imgH - 90, width: cellW, height: imgH, color: PAPER, borderColor: LINE, borderWidth: 0.5 });
      }

      const labelTop = yCell + cellH - imgH - 100;
      page.drawText(p.sku, { x, y: labelTop, size: 7.5, font: fonts.mono, color: MUTED });
      page.drawText(p.name, { x, y: labelTop - 14, size: 12, font: fonts.serif, color: INK });
      page.drawText(`${p.qualifierLine.toUpperCase()}   ·   ${p.priceLabel}`, { x, y: labelTop - 28, size: 8.5, font: fonts.mono, color: INK_2 });
      if (p.dimensionsLine) {
        page.drawText(p.dimensionsLine, { x, y: labelTop - 41, size: 8.5, font: fonts.serifItalic, color: MUTED });
      }
    }

    pageFooter(page, fonts, section.title.toUpperCase(), pageNum);
    pageNum += 1;
  }

  return pageNum;
}

async function renderCare(pdfDoc: PDFDocument, fonts: Fonts, spec: CatalogSpec, pageNum: number): Promise<number> {
  // Care intro page
  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - PAD_TOP;
  page.drawText("06 — CARE & MAINTENANCE", { x: PAD_X, y, size: 9, font: fonts.mono, color: MUTED });
  y -= 36;
  page.drawText("Built to last. Easy to maintain.", { x: PAD_X, y, size: 24, font: fonts.serif, color: INK });
  y -= 32;
  y = drawWrapped(page, spec.care.intro, PAD_X, y, PAGE_W - 2 * PAD_X, fonts.serif, 11, 17, INK_2);
  y -= 24;

  for (const r of spec.care.routines) {
    page.drawText(r.title.toUpperCase(), { x: PAD_X, y, size: 9, font: fonts.mono, color: ACCENT });
    page.drawText(r.body, { x: PAD_X + 80, y, size: 10, font: fonts.serif, color: INK_2 });
    const lines = wrap(r.body, PAGE_W - 2 * PAD_X - 80, fonts.serif, 10);
    // Re-draw wrapped (skip the placeholder above).
    for (let i = 0; i < lines.length; i += 1) {
      page.drawText(lines[i], { x: PAD_X + 80, y: y - i * 14, size: 10, font: fonts.serif, color: INK_2 });
    }
    y -= lines.length * 14 + 14;
  }
  pageFooter(page, fonts, "CARE & MAINTENANCE", pageNum);
  pageNum += 1;

  // Care kits page
  if (spec.care.kits.length > 0) {
    page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    let yTop = PAGE_H - PAD_TOP;
    page.drawText("CARE KITS", { x: PAD_X, y: yTop, size: 9, font: fonts.mono, color: MUTED });
    yTop -= 30;
    page.drawText("Bundled care for each product family.", { x: PAD_X, y: yTop, size: 18, font: fonts.serif, color: INK });
    yTop -= 24;
    yTop = drawWrapped(page, spec.care.kitsIntro, PAD_X, yTop, PAGE_W - 2 * PAD_X, fonts.serifItalic, 10, 14, INK_2);
    yTop -= 16;

    const cellW = (PAGE_W - 2 * PAD_X - 20) / 2;
    const cellH = 220;
    for (let i = 0; i < spec.care.kits.length; i += 1) {
      const k = spec.care.kits[i];
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = PAD_X + col * (cellW + 20);
      const yCell = yTop - (row + 1) * cellH - row * 16;
      const img = await embedImageSafe(pdfDoc, k.imageUrl);
      if (img) {
        const drawH = 130;
        const drawW = drawH * (img.width / img.height);
        const xImg = x + (cellW - drawW) / 2;
        page.drawImage(img, { x: xImg, y: yCell + cellH - drawH - 30, width: drawW, height: drawH });
        addLinkAnnotation(pdfDoc, page, xImg, yCell + cellH - drawH - 30, drawW, drawH, k.productUrl);
      }
      const labelY = yCell + cellH - 180;
      page.drawText(k.sku, { x, y: labelY, size: 7, font: fonts.mono, color: MUTED });
      page.drawText(k.name, { x, y: labelY - 14, size: 11, font: fonts.serif, color: INK });
      page.drawText(k.priceLabel, { x, y: labelY - 28, size: 9, font: fonts.mono, color: ACCENT });
    }
    pageFooter(page, fonts, "CARE KITS", pageNum);
    pageNum += 1;
  }

  return pageNum;
}

function renderCommissions(pdfDoc: PDFDocument, fonts: Fonts, spec: CatalogSpec, pageNum: number): number {
  const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - PAD_TOP;
  page.drawText("07 — COMMISSIONS", { x: PAD_X, y, size: 9, font: fonts.mono, color: MUTED });
  y -= 36;
  page.drawText("Built for the space it lives in.", { x: PAD_X, y, size: 24, font: fonts.serif, color: INK });
  y -= 32;
  y = drawWrapped(page, spec.commissions.intro, PAD_X, y, PAGE_W - 2 * PAD_X, fonts.serif, 11, 17, INK_2);
  y -= 24;

  for (let i = 0; i < spec.commissions.steps.length; i += 1) {
    const s = spec.commissions.steps[i];
    const num = String(i + 1).padStart(2, "0");
    page.drawText(num, { x: PAD_X, y, size: 16, font: fonts.serif, color: ACCENT });
    page.drawText(s.title, { x: PAD_X + 32, y, size: 12, font: fonts.serifBold, color: INK });
    y -= 16;
    y = drawWrapped(page, s.body, PAD_X + 32, y, PAGE_W - 2 * PAD_X - 32, fonts.serif, 10, 14, INK_2);
    y -= 14;
  }
  y -= 12;
  page.drawText(spec.commissions.leadTime, { x: PAD_X, y, size: 10, font: fonts.serifItalic, color: MUTED });
  pageFooter(page, fonts, "COMMISSIONS", pageNum);
  return pageNum + 1;
}

function renderTradeAndLeadTimes(pdfDoc: PDFDocument, fonts: Fonts, spec: CatalogSpec, pageNum: number): number {
  const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - PAD_TOP;
  page.drawText("08 — TRADE & LEAD TIMES", { x: PAD_X, y, size: 9, font: fonts.mono, color: MUTED });
  y -= 36;
  page.drawText("Trade program.", { x: PAD_X, y, size: 24, font: fonts.serif, color: INK });
  y -= 26;
  y = drawWrapped(page, spec.trade.intro, PAD_X, y, PAGE_W - 2 * PAD_X, fonts.serif, 11, 16, INK_2);
  y -= 14;
  for (const perk of spec.trade.perks) {
    page.drawText("·", { x: PAD_X, y, size: 11, font: fonts.serif, color: ACCENT });
    y = drawWrapped(page, perk, PAD_X + 14, y, PAGE_W - 2 * PAD_X - 14, fonts.serif, 10, 14, INK_2);
    y -= 6;
  }
  y -= 24;

  page.drawText("Lead times.", { x: PAD_X, y, size: 18, font: fonts.serif, color: INK });
  y -= 22;
  y = drawWrapped(page, spec.leadTimes.intro, PAD_X, y, PAGE_W - 2 * PAD_X, fonts.serifItalic, 10, 14, INK_2);
  y -= 14;
  for (const r of spec.leadTimes.ranges) {
    page.drawText(r.category, { x: PAD_X, y, size: 10, font: fonts.serif, color: INK });
    page.drawText(r.time, { x: PAGE_W - PAD_X - fonts.mono.widthOfTextAtSize(r.time, 9), y, size: 9, font: fonts.mono, color: ACCENT });
    y -= 16;
  }
  pageFooter(page, fonts, "TRADE · LEAD TIMES", pageNum);
  return pageNum + 1;
}

function renderGlossary(pdfDoc: PDFDocument, fonts: Fonts, spec: CatalogSpec, pageNum: number): number {
  const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - PAD_TOP;
  page.drawText("09 — GLOSSARY", { x: PAD_X, y, size: 9, font: fonts.mono, color: MUTED });
  y -= 36;
  page.drawText("A short language guide.", { x: PAD_X, y, size: 24, font: fonts.serif, color: INK });
  y -= 32;
  for (const g of spec.glossary) {
    page.drawText(g.term, { x: PAD_X, y, size: 11, font: fonts.serifBold, color: INK });
    y -= 14;
    y = drawWrapped(page, g.definition, PAD_X, y, PAGE_W - 2 * PAD_X, fonts.serif, 9.5, 13, INK_2);
    y -= 12;
  }
  pageFooter(page, fonts, "GLOSSARY", pageNum);
  return pageNum + 1;
}

function renderContact(pdfDoc: PDFDocument, fonts: Fonts, spec: CatalogSpec, pageNum: number): number {
  const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: PAPER });
  const cx = PAGE_W / 2;
  let y = PAGE_H - 200;
  drawCenteredText(page, "10 — CONTACT", cx, y, fonts.mono, 9, MUTED);
  y -= 40;
  drawCenteredText(page, spec.contact.studioName, cx, y, fonts.serifBold, 22, INK);
  y -= 40;
  for (const line of spec.contact.addressLines) {
    drawCenteredText(page, line, cx, y, fonts.serif, 11, INK_2);
    y -= 16;
  }
  y -= 8;
  drawCenteredText(page, spec.contact.email, cx, y, fonts.mono, 10, INK_2);
  y -= 16;
  drawCenteredText(page, spec.contact.hours, cx, y, fonts.serifItalic, 10, MUTED);
  y -= 36;
  drawCenteredText(page, spec.contact.website, cx, y, fonts.serifBold, 13, INK);
  pageFooter(page, fonts, "CONTACT", pageNum);
  return pageNum + 1;
}

// ── Public entry ──

export async function renderCatalogPdf(spec: CatalogSpec): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(`${spec.meta.title} — ${spec.meta.subtitle}`);
  pdfDoc.setAuthor("Backus Design Co.");
  pdfDoc.setSubject(`Catalog v${spec.meta.version}`);

  const fonts: Fonts = {
    serif: await pdfDoc.embedFont(StandardFonts.TimesRoman),
    serifBold: await pdfDoc.embedFont(StandardFonts.TimesRomanBold),
    serifItalic: await pdfDoc.embedFont(StandardFonts.TimesRomanItalic),
    mono: await pdfDoc.embedFont(StandardFonts.Courier),
    sans: await pdfDoc.embedFont(StandardFonts.Helvetica),
    sansBold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
  };

  await renderCover(pdfDoc, fonts, spec);
  renderInsideCover(pdfDoc, fonts, spec);

  let pageNum = 3;
  renderDesignerLetter(pdfDoc, fonts, spec, pageNum);
  pageNum += 1;

  pageNum = await renderStudioSpread(pdfDoc, fonts, spec, pageNum);
  pageNum = renderMarket(pdfDoc, fonts, spec, pageNum);
  pageNum = renderColorGuide(pdfDoc, fonts, spec, pageNum);
  pageNum = renderFinishes(pdfDoc, fonts, spec, pageNum);

  for (const section of spec.sections) {
    pageNum = await renderSection(pdfDoc, fonts, spec, section, pageNum);
  }

  pageNum = await renderCare(pdfDoc, fonts, spec, pageNum);
  pageNum = renderCommissions(pdfDoc, fonts, spec, pageNum);
  pageNum = renderTradeAndLeadTimes(pdfDoc, fonts, spec, pageNum);
  pageNum = renderGlossary(pdfDoc, fonts, spec, pageNum);
  pageNum = renderContact(pdfDoc, fonts, spec, pageNum);

  return pdfDoc.save();
}
