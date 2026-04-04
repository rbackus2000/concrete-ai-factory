import { PDFDocument, rgb } from "pdf-lib";

import type { DensityFn, PrintScenario, WallConfig } from "./scenarios";

// ─── LINE DATA ─────────────────────────────────────────────────

export type SlatLine = {
  y: number;
  x: number;
  width: number;
  weight: number;
  density: number;
  spacing: number;
};

export type SlatData = {
  slatIndex: number;
  face: "A" | "B";
  totalLines: number;
  slatWidthMM: number;
  slatHeightMM: number;
  lineWeightMM: number;
  lines: SlatLine[];
};

function densityToSpacingMM(density: number, lineWeight: number): number | null {
  if (density < 0.01) return null;
  const minSpacing = lineWeight + 0.25;
  const maxSpacing = 22;
  return Math.max(minSpacing, Math.min(maxSpacing, minSpacing + (maxSpacing - minSpacing) * (1 - density)));
}

export function generateSlatLines(params: {
  scenario: PrintScenario;
  face: "A" | "B";
  slatIndex: number;
  totalSlats: number;
  config: WallConfig;
  isEmergent?: boolean;
}): SlatData {
  const { scenario, face, slatIndex, totalSlats, config, isEmergent } = params;
  const xFrac = (slatIndex + 0.5) / totalSlats;

  let densityFn: DensityFn;

  if (isEmergent) {
    const isOdd = slatIndex % 2 === 0;
    const bgFn = isOdd ? scenario.densityA : scenario.densityB;
    const cFn = scenario.densityC;
    densityFn = (y, x) => Math.max(0, Math.min(1, bgFn(y, x) * 0.25 + cFn(y, x) * 0.85));
  } else {
    densityFn = face === "A" ? scenario.densityA : scenario.densityB;
  }

  const lines: SlatLine[] = [];
  let currentY = 0;

  while (currentY <= config.slatHeightMM) {
    const yFrac = 1 - currentY / config.slatHeightMM;
    const density = Math.max(0, Math.min(1, densityFn(yFrac, xFrac)));
    const spacing = densityToSpacingMM(density, config.lineWeightMM);

    if (spacing !== null) {
      lines.push({
        y: currentY,
        x: 0,
        width: config.slatWidthMM,
        weight: config.lineWeightMM,
        density: parseFloat(density.toFixed(3)),
        spacing: parseFloat(spacing.toFixed(3)),
      });
      currentY += spacing;
    } else {
      currentY += 5;
    }
  }

  return {
    slatIndex,
    face,
    totalLines: lines.length,
    slatWidthMM: config.slatWidthMM,
    slatHeightMM: config.slatHeightMM,
    lineWeightMM: config.lineWeightMM,
    lines,
  };
}

// ─── SVG ───────────────────────────────────────────────────────

export function generateSlatSVG(slatData: SlatData, totalSlats: number): string {
  const { slatIndex, face, slatWidthMM, slatHeightMM, lineWeightMM, lines } = slatData;

  const svgLines = lines
    .map(
      (line) =>
        `  <rect x="0" y="${line.y.toFixed(4)}" width="${slatWidthMM}" height="${lineWeightMM}" fill="#000000"/>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${slatWidthMM}mm" height="${slatHeightMM}mm" viewBox="0 0 ${slatWidthMM} ${slatHeightMM}" color-interpolation="linearRGB">
  <!-- RB Studio SW-01 Print File -->
  <!-- Slat: ${slatIndex + 1} of ${totalSlats} -->
  <!-- Face: Side ${face} -->
  <!-- Line count: ${lines.length} -->
  <!-- Line weight: ${lineWeightMM}mm -->
  <!-- Generated: ${new Date().toISOString()} -->
  <rect width="${slatWidthMM}" height="${slatHeightMM}" fill="#FFFFFF"/>
${svgLines}
</svg>`;
}

// ─── PDF ───────────────────────────────────────────────────────

const MM_TO_PT = 2.8346;

export async function generateSlatPDF(slatData: SlatData, totalSlats: number): Promise<Uint8Array> {
  const { slatIndex, face, slatWidthMM, slatHeightMM, lineWeightMM, lines } = slatData;

  const widthPt = slatWidthMM * MM_TO_PT;
  const heightPt = slatHeightMM * MM_TO_PT;
  const lineWeightPt = lineWeightMM * MM_TO_PT;

  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(`SW-01 Slat ${slatIndex + 1} Side ${face}`);
  pdfDoc.setAuthor("RB Studio Print Generator");
  pdfDoc.setCreationDate(new Date());

  const page = pdfDoc.addPage([widthPt, heightPt]);

  // White background
  page.drawRectangle({ x: 0, y: 0, width: widthPt, height: heightPt, color: rgb(1, 1, 1) });

  // Draw lines (PDF y-axis inverted — 0 is bottom)
  for (const line of lines) {
    const yPt = heightPt - line.y * MM_TO_PT - lineWeightPt;
    page.drawRectangle({
      x: 0,
      y: yPt,
      width: widthPt,
      height: lineWeightPt,
      color: rgb(0, 0, 0),
    });
  }

  // Info text below crop area
  page.drawText(
    `RB Studio | Slat ${String(slatIndex + 1).padStart(2, "0")} | Side ${face} | ${slatWidthMM}mm x ${slatHeightMM}mm | Lines: ${lines.length} | ${new Date().toLocaleDateString()}`,
    { x: 4, y: 4, size: 5, color: rgb(0.5, 0.5, 0.5) },
  );

  return pdfDoc.save();
}

// ─── DXF ───────────────────────────────────────────────────────

export function generateSlatDXF(slatData: SlatData): string {
  const { slatWidthMM, slatHeightMM, lineWeightMM, lines } = slatData;

  let dxf = `0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1015\n9\n$INSUNITS\n70\n4\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n`;

  // Stencil cuts
  for (const line of lines) {
    const y0 = line.y.toFixed(4);
    const y1 = (line.y + lineWeightMM).toFixed(4);
    dxf += `0\nLWPOLYLINE\n8\nSTENCIL_CUTS\n90\n4\n70\n1\n10\n0.0000\n20\n${y0}\n10\n${slatWidthMM.toFixed(4)}\n20\n${y0}\n10\n${slatWidthMM.toFixed(4)}\n20\n${y1}\n10\n0.0000\n20\n${y1}\n`;
  }

  // Border
  dxf += `0\nLWPOLYLINE\n8\nSTENCIL_BORDER\n90\n4\n70\n1\n10\n0.0000\n20\n0.0000\n10\n${slatWidthMM.toFixed(4)}\n20\n0.0000\n10\n${slatWidthMM.toFixed(4)}\n20\n${slatHeightMM.toFixed(4)}\n10\n0.0000\n20\n${slatHeightMM.toFixed(4)}\n`;

  // Registration holes
  const holes = [
    { x: 15, y: 15 },
    { x: slatWidthMM - 15, y: 15 },
    { x: 15, y: slatHeightMM - 15 },
    { x: slatWidthMM - 15, y: slatHeightMM - 15 },
  ];
  for (const h of holes) {
    dxf += `0\nCIRCLE\n8\nREGISTRATION\n10\n${h.x.toFixed(4)}\n20\n${h.y.toFixed(4)}\n40\n2.5000\n`;
  }

  dxf += `0\nENDSEC\n0\nEOF`;
  return dxf;
}

// ─── SPEC SHEET ────────────────────────────────────────────────

export function generateSpecSheet(scenario: PrintScenario, sizeLabel: string, config: WallConfig): string {
  return `RB STUDIO — PRINT SPECIFICATION SHEET
Generated: ${new Date().toISOString()}

INSTALLATION DETAILS
Scenario:         ${scenario.label}
Side A Artwork:   ${scenario.sideALabel}
Side B Artwork:   ${scenario.sideBLabel}
Emergent Image:   ${scenario.emergentLabel}
Wall Size:        ${sizeLabel}

PHYSICAL DIMENSIONS
Total Slats:      ${config.slatCount}
Slat Width:       ${config.slatWidthMM}mm (${(config.slatWidthMM / 25.4).toFixed(2)} inches)
Slat Height:      ${config.slatHeightMM}mm (${(config.slatHeightMM / 304.8).toFixed(1)} feet)
Wall Width:       ${(config.slatCount * config.slatWidthMM).toFixed(1)}mm (${((config.slatCount * config.slatWidthMM) / 304.8).toFixed(1)} feet)
Line Weight:      ${config.lineWeightMM}mm

PRINT SPECIFICATIONS
Method:           UV Flatbed Ink OR Physical Stencil
Ink Color:        100% Black (K100 CMYK) or #000000
Background:       White or bare sealed concrete
Resolution:       720dpi minimum / 1440dpi recommended

FILE CONTENTS
PDF Files:        ${config.slatCount * 2} files
SVG Files:        ${config.slatCount * 2} files
DXF Files:        ${config.slatCount * 2} files

FILE NAMING
[SCENARIO]_[SIZE]_SLAT[NN]_SIDE[A/B].[ext]

QUALITY CONTROL
1. Print SLAT${Math.floor(config.slatCount / 2)} SIDE A + SLAT${Math.floor(config.slatCount / 2) + 1} SIDE B as test
2. View from 20-30 feet — verify image continuity
3. Check line weight consistency
4. Verify slat numbers match files before full run
`;
}
