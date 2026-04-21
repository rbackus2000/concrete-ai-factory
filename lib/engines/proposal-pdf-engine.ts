/**
 * RB Studio SW-01 Proposal PDF Generator
 * 16-page premium client-facing proposal using pdf-lib
 */

import { PDFDocument, rgb, StandardFonts, type PDFPage, type PDFFont, type RGB } from "pdf-lib";

import { SCENARIOS, SCENARIO_LIST, type PrintScenario } from "./print-generator/scenarios";
import {
  calculateSlatWallCost,
  WALL_PRESETS,
  type SlatWallCalcResult,
} from "./slat-wall-calculator-engine";

// ─── CONSTANTS ─────────────────────────────────────────────

const PAGE_W = 612; // 8.5" in pts
const PAGE_H = 792; // 11" in pts
const MARGIN = 54;  // 0.75"
const CONTENT_W = PAGE_W - MARGIN * 2;

// Colors
const BLACK: RGB = rgb(0, 0, 0);
const WHITE: RGB = rgb(1, 1, 1);
const GOLD: RGB = rgb(0.784, 0.663, 0.431);
const DARK: RGB = rgb(0.039, 0.039, 0.039);
const MID_GRAY: RGB = rgb(0.4, 0.4, 0.4);
const LIGHT_GRAY: RGB = rgb(0.9, 0.9, 0.9);

// ─── TYPES ─────────────────────────────────────────────────

export type ProposalInput = {
  clientName: string;
  projectName: string;
  clientEmail?: string;
  siteAddress?: string;
  proposalNumber: string;
  proposalDate: string;
  scenarioId: string;
  slatCount: number;
  slatWidthIn: number;
  slatHeightFt: number;
  printMethod: "uv" | "stencil";
  includeInstall: boolean;
  aiImages?: Record<string, string>; // "A" | "B" | "C" -> image URL
};

type Fonts = {
  regular: PDFFont;
  bold: PDFFont;
  oblique: PDFFont;
};

// ─── SCENARIO COPY ─────────────────────────────────────────

const SCENARIO_COPY: Record<string, {
  sideADesc: string;
  sideBDesc: string;
  emergentDesc: string;
  concept: string;
}> = {
  skull: {
    sideADesc: "Dramatic Hokusai-inspired ocean waves rendered entirely in horizontal line density. The wave mass reads from the bottom - white water at base, dense black crest at top. Pure elemental force.",
    sideBDesc: "A centered solar disc rendered in horizontal line density. Dense center, sparse outer field. The disc reads as a bold centered mass against open space.",
    emergentDesc: "A human skull emerges from the optical combination of wave and disc strips. Eye socket voids appear where both strip types are sparse simultaneously. The reveal is sudden and confrontational.",
    concept: "The ocean has always been a symbol of the unconscious - vast, powerful, and containing hidden depths. The sun is the conscious mind - centered, radiant, and defining. Where the two meet, mortality stares back. The skull does not hide in either image alone - it exists only in the space between.",
  },
  wolf: {
    sideADesc: "A single dominant mountain peak expressed in horizontal line density. Dense base tapering to peak, surrounded by white sky. The mountain reads as elemental and solitary.",
    sideBDesc: "A total solar eclipse disc centered on the wall. Maximum density at center. The disc reads as both absence and presence - a perfect circle of darkness.",
    emergentDesc: "A wolf head emerges facing forward. Pointed ear tips align with the mountain peak positions. The eclipse disc fills the wolf cranium mass. The wolf looks back with fierce stillness.",
    concept: "The mountain is permanence. The eclipse is transformation - the moment when light is consumed. The wolf is the predator that lives between civilization and wilderness. When the mountain and the eclipse combine, the wolf appears - the wild thing that was always there.",
  },
  eagle: {
    sideADesc: "Two desert dune peaks side by side rendered in horizontal line density. Left and right dune masses with a valley between them. The desert reads as vast, ancient, and still.",
    sideBDesc: "A crescent moon rendered asymmetrically - dense mass on the left, open night sky on the right. The crescent reads as nocturnal and precise.",
    emergentDesc: "An eagle head emerges facing forward. The two dune peaks align with the eagle eye positions. The crescent moon provides the curved beak form. The eagle reads as sovereign and alert.",
    concept: "The desert and the moon share a quality - both are ancient, both are vast, both are navigated by the eagle. When desert and moonlight combine, the apex predator appears - the sovereign of the sky looking down.",
  },
  bear: {
    sideADesc: "A dense city skyline rendered in horizontal line density. Irregular building heights create a jagged rooftop profile. The city reads as dense, complex, and human-built.",
    sideBDesc: "A storm sky rendered dark at top, clearing below. Heavy oppressive cloud mass above, open air below. The storm reads as inevitable and indifferent.",
    emergentDesc: "A bear head emerges facing forward. The city skyline provides the irregular ear and brow profile. The storm darkness fills the bear face mass. The bear reads as ancient and powerful.",
    concept: "We built cities to protect ourselves from nature. We built them under skies that do not care. The bear was here before the first city and will be here after the last one falls. When the city and the storm combine, the bear appears - nature's reminder that wildness outlasts everything we construct.",
  },
  buddha: {
    sideADesc: "A vast storm sky rendered dark at top, clearing below. Density increases continuously from white at base to near-black at top. The storm reads as oppressive, vast, and inevitable.",
    sideBDesc: "A rising sun at the horizon rendered in horizontal line density. Dense disc centered low, dense horizon base, open sky above. The sunrise reads as emergence - light arriving from below.",
    emergentDesc: "A Buddha face emerges in serene meditation. Half-closed eyes read through the line field. The ushnisha crown appears at the top. The face is wide, calm, and radiates absolute stillness.",
    concept: "The storm is suffering - the first noble truth, the weight of existence pressing down. The sunrise is awakening - the possibility of liberation arriving from below. Where they meet and balance, the Buddha appears - not hidden in either alone, but existing in the middle way between darkness and light.",
  },
};

const SKU_DATA = [
  {
    key: "small" as const,
    sku: "SW-SMALL",
    title: "12 Foot Installation",
    desc: "The SW-SMALL is designed for intimate gallery spaces, residential installations, and boutique hospitality environments. 16 slats provide sufficient resolution for all five artwork scenarios at a scale that commands attention without overwhelming the space.",
    slatCount: 16, widthFt: 12, heightFt: 8, printArea: 192, leadTime: "8-10 weeks",
    price: "$48,200",
  },
  {
    key: "standard" as const,
    sku: "SW-STANDARD",
    title: "24 Foot Installation",
    desc: "The SW-STANDARD is our flagship installation - the reference configuration for which all five artwork scenarios were designed. 32 slats at 9 inches each delivers a 24-foot wall that commands any space.",
    slatCount: 32, widthFt: 24, heightFt: 10, printArea: 480, leadTime: "10-14 weeks",
    price: "$87,300",
  },
  {
    key: "large" as const,
    sku: "SW-LARGE",
    title: "36 Foot Installation",
    desc: "The SW-LARGE is designed for museum installations, large public lobbies, and landmark hospitality environments. At 36 feet wide and 12 feet tall, the installation becomes an architectural element in its own right.",
    slatCount: 48, widthFt: 36, heightFt: 12, printArea: 864, leadTime: "14-18 weeks",
    price: "$124,800",
  },
];

// ─── HELPER FUNCTIONS ──────────────────────────────────────

function drawHeaderBar(page: PDFPage, fonts: Fonts, title: string, rightText?: string) {
  const y = PAGE_H - MARGIN;
  page.drawRectangle({ x: 0, y: y - 32, width: PAGE_W, height: 32, color: DARK });
  page.drawText(title, { x: MARGIN, y: y - 22, size: 11, font: fonts.bold, color: WHITE });
  if (rightText) {
    const rw = fonts.bold.widthOfTextAtSize(rightText, 11);
    page.drawText(rightText, { x: PAGE_W - MARGIN - rw, y: y - 22, size: 11, font: fonts.bold, color: WHITE });
  }
  page.drawRectangle({ x: 0, y: y - 33.5, width: PAGE_W, height: 1.5, color: GOLD });
  return y - 50;
}

function drawGoldLabel(page: PDFPage, fonts: Fonts, text: string, x: number, y: number) {
  page.drawText(text, { x, y, size: 8, font: fonts.bold, color: GOLD });
}

function drawBody(page: PDFPage, fonts: Fonts, text: string, x: number, y: number, maxWidth: number, size = 10, leading = 15): number {
  const words = text.split(" ");
  let line = "";
  let currentY = y;

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    const testWidth = fonts.regular.widthOfTextAtSize(testLine, size);
    if (testWidth > maxWidth && line) {
      page.drawText(line, { x, y: currentY, size, font: fonts.regular, color: BLACK });
      currentY -= leading;
      line = word;
    } else {
      line = testLine;
    }
  }
  if (line) {
    page.drawText(line, { x, y: currentY, size, font: fonts.regular, color: BLACK });
    currentY -= leading;
  }
  return currentY;
}

function drawBodyColor(page: PDFPage, fonts: Fonts, text: string, x: number, y: number, maxWidth: number, color: RGB, size = 10, leading = 15): number {
  const words = text.split(" ");
  let line = "";
  let currentY = y;

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    const testWidth = fonts.regular.widthOfTextAtSize(testLine, size);
    if (testWidth > maxWidth && line) {
      page.drawText(line, { x, y: currentY, size, font: fonts.regular, color });
      currentY -= leading;
      line = word;
    } else {
      line = testLine;
    }
  }
  if (line) {
    page.drawText(line, { x, y: currentY, size, font: fonts.regular, color });
    currentY -= leading;
  }
  return currentY;
}

function drawDarkPanel(page: PDFPage, x: number, y: number, w: number, h: number) {
  page.drawRectangle({ x, y, width: w, height: h, color: DARK });
}

function drawRule(page: PDFPage, y: number, color: RGB = GOLD, weight = 1.5) {
  page.drawRectangle({ x: MARGIN, y, width: CONTENT_W, height: weight, color });
}

function drawSpecRow(page: PDFPage, fonts: Fonts, label: string, value: string, x: number, y: number, width: number, alt: boolean) {
  if (alt) {
    page.drawRectangle({ x, y: y - 4, width, height: 16, color: LIGHT_GRAY });
  }
  page.drawText(label, { x: x + 8, y, size: 9, font: fonts.bold, color: MID_GRAY });
  const vw = fonts.regular.widthOfTextAtSize(value, 9);
  page.drawText(value, { x: x + width - vw - 8, y, size: 9, font: fonts.regular, color: BLACK });
}

function drawLineCanvas(page: PDFPage, x: number, y: number, w: number, h: number, densityFn: (yFrac: number, xFrac: number) => number, slatCount: number) {
  // Background
  page.drawRectangle({ x, y, width: w, height: h, color: LIGHT_GRAY });

  const sw = w / slatCount;
  for (let i = 0; i < slatCount; i++) {
    const xFrac = (i + 0.5) / slatCount;
    const lineCount = 40;
    for (let row = 0; row < lineCount; row++) {
      const yFrac = row / lineCount;
      const ly = y + h - yFrac * h;
      const d = Math.max(0, Math.min(1, densityFn(yFrac, xFrac)));
      if (d > 0.05) {
        page.drawRectangle({
          x: x + i * sw,
          y: ly,
          width: sw,
          height: Math.max(0.3, d * 2),
          color: rgb(0, 0, 0),
          opacity: Math.min(1, d * 1.2),
        });
      }
    }
    // Slat edge
    if (i > 0) {
      page.drawLine({
        start: { x: x + i * sw, y },
        end: { x: x + i * sw, y: y + h },
        thickness: 0.25,
        color: MID_GRAY,
        opacity: 0.3,
      });
    }
  }
}

function drawPageFooter(page: PDFPage, fonts: Fonts, pageNumber: number, totalPages: number) {
  page.drawText("RB Studio  |  CONFIDENTIAL", { x: MARGIN, y: 28, size: 7, font: fonts.regular, color: MID_GRAY });
  const pText = `${pageNumber} / ${totalPages}`;
  const pw = fonts.regular.widthOfTextAtSize(pText, 7);
  page.drawText(pText, { x: PAGE_W - MARGIN - pw, y: 28, size: 7, font: fonts.regular, color: MID_GRAY });
}

function centerText(page: PDFPage, text: string, y: number, size: number, font: PDFFont, color: RGB) {
  const w = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: (PAGE_W - w) / 2, y, size, font, color });
}

// ─── PAGE RENDERERS ────────────────────────────────────────

function renderCover(page: PDFPage, fonts: Fonts, input: ProposalInput) {
  // Full dark background
  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: DARK });

  // RB mark (simplified geometric)
  const cx = PAGE_W / 2;
  // Outer rect
  page.drawRectangle({ x: cx - 30, y: PAGE_H - 160, width: 60, height: 80, borderColor: WHITE, borderWidth: 1.5, color: DARK });
  // R top
  centerText(page, "R", PAGE_H - 120, 36, fonts.bold, WHITE);
  // Divider lines
  page.drawRectangle({ x: cx - 22, y: PAGE_H - 128, width: 44, height: 1.5, color: WHITE });
  page.drawRectangle({ x: cx - 22, y: PAGE_H - 133, width: 44, height: 1.5, color: WHITE });
  // B bottom
  centerText(page, "B", PAGE_H - 157, 36, fonts.bold, WHITE);

  // STUDIO
  centerText(page, "S T U D I O", PAGE_H - 180, 8, fonts.regular, GOLD);
  page.drawRectangle({ x: cx - 60, y: PAGE_H - 190, width: 120, height: 1, color: GOLD });

  // Title
  centerText(page, "ROTATING SLAT WALL", PAGE_H / 2 + 30, 28, fonts.bold, WHITE);
  centerText(page, "INSTALLATION SYSTEM", PAGE_H / 2, 28, fonts.bold, GOLD);
  centerText(page, "SW-01 PRODUCT LINE  -  COMPLETE PROPOSAL", PAGE_H / 2 - 30, 10, fonts.regular, MID_GRAY);

  // Lower rule
  const lowerY = 220;
  page.drawRectangle({ x: MARGIN, y: lowerY, width: CONTENT_W, height: 1.5, color: GOLD });

  // Two column info
  const infoY = lowerY - 24;
  drawGoldLabel(page, fonts, "PREPARED FOR", MARGIN, infoY);
  page.drawText(input.clientName, { x: MARGIN, y: infoY - 16, size: 10, font: fonts.regular, color: WHITE });
  drawGoldLabel(page, fonts, "PROJECT", MARGIN, infoY - 40);
  page.drawText(input.projectName, { x: MARGIN, y: infoY - 56, size: 10, font: fonts.regular, color: WHITE });

  const rx = PAGE_W - MARGIN;
  const drawRight = (label: string, value: string, yOff: number) => {
    const lw = fonts.bold.widthOfTextAtSize(label, 8);
    page.drawText(label, { x: rx - lw, y: infoY - yOff, size: 8, font: fonts.bold, color: GOLD });
    const vw = fonts.regular.widthOfTextAtSize(value, 10);
    page.drawText(value, { x: rx - vw, y: infoY - yOff - 16, size: 10, font: fonts.regular, color: WHITE });
  };
  drawRight("PREPARED BY", "RB Studio", 0);
  drawRight("DATE", input.proposalDate, 40);
  drawRight("PROPOSAL", input.proposalNumber, 80);

  // Confidential
  centerText(page, "CONFIDENTIAL - THIS PROPOSAL IS PREPARED EXCLUSIVELY FOR THE NAMED RECIPIENT", 50, 7, fonts.regular, MID_GRAY);
}

function renderIntroPage(page: PDFPage, fonts: Fonts) {
  let y = drawHeaderBar(page, fonts, "RB STUDIO - WHO WE ARE");

  // Left column
  const leftW = CONTENT_W * 0.55;
  page.drawText("We build things", { x: MARGIN, y, size: 20, font: fonts.bold, color: BLACK });
  y -= 26;
  page.drawText("that make people stop.", { x: MARGIN, y, size: 20, font: fonts.bold, color: BLACK });
  y -= 24;

  const introText = "RB Studio designs and fabricates rotating slat wall installations for galleries, hospitality spaces, corporate lobbies, and public environments. Our SW-01 system transforms any wall into a three-state artwork - each state a complete composition, each rotation a revelation. Side A shows one image. Side B shows another. The alternating state reveals a third image that was hidden in both - emerging only when the slats rotate. Every installation uses the same horizontal line density method - the same visual language across all three states. The system is modular, motorized, and permanent. We handle the complete scope - engineering, fabrication, artwork production, print, and installation - delivered as a single turnkey project.";
  y = drawBody(page, fonts, introText, MARGIN, y, leftW - 20);

  // Right column - dark panel
  const panelX = MARGIN + leftW + 10;
  const panelW = CONTENT_W - leftW - 10;
  const panelH = 380;
  const panelY = PAGE_H - MARGIN - 32 - panelH - 18;
  drawDarkPanel(page, panelX, panelY, panelW, panelH);

  let py = panelY + panelH - 20;
  drawGoldLabel(page, fonts, "STUDIO FACTS", panelX + 16, py);
  py -= 6;
  page.drawRectangle({ x: panelX + 16, y: py, width: panelW - 32, height: 1, color: GOLD });
  py -= 20;

  const facts = [
    ["FOUNDED", "2024"],
    ["SYSTEM", "SW-01"],
    ["LEAD TIME", "8-18 WKS"],
    ["WARRANTY", "2 YEARS"],
    ["INSTALLATION", "INCLUDED"],
  ];
  for (const [label, value] of facts) {
    page.drawText(label, { x: panelX + 16, y: py, size: 7, font: fonts.regular, color: GOLD });
    py -= 18;
    page.drawText(value, { x: panelX + 16, y: py, size: 14, font: fonts.bold, color: WHITE });
    py -= 14;
    page.drawRectangle({ x: panelX + 16, y: py, width: panelW - 32, height: 1, color: GOLD, opacity: 0.3 });
    py -= 16;
  }

  drawPageFooter(page, fonts, 2, 16);
}

function renderSystemOverview(page: PDFPage, fonts: Fonts) {
  let y = drawHeaderBar(page, fonts, "SW-01 SYSTEM - HOW IT WORKS");

  page.drawText("One wall. Three complete artworks.", { x: MARGIN, y, size: 20, font: fonts.bold, color: BLACK });
  y -= 18;
  y = drawBody(page, fonts, "The SW-01 system uses a simple mechanical principle - each slat rotates 180 degrees on its vertical center axis - to reveal three distinct complete artworks from a single wall installation.", MARGIN, y, CONTENT_W);
  y -= 10;

  // Three columns
  const colW = (CONTENT_W - 16) / 3;
  const colH = 180;
  const states = [
    { title: "STATE 1", sub: "ALL SLATS FORWARD", text: "All slats face forward showing Side A. The complete Side A artwork reads across the full wall width. Side B is invisible - facing the wall." },
    { title: "STATE 2", sub: "ALL SLATS ROTATED", text: "All slats rotate 180 degrees showing Side B. The complete Side B artwork reads across the full wall width. Side A faces the wall." },
    { title: "STATE 3", sub: "ALTERNATING SLATS", text: "Odd slats show Side A, even slats show Side B. The alternating strips combine to reveal a third image hidden in both." },
  ];

  for (let i = 0; i < 3; i++) {
    const cx = MARGIN + i * (colW + 8);
    drawDarkPanel(page, cx, y - colH, colW, colH);
    page.drawText(states[i].title, { x: cx + 12, y: y - 20, size: 11, font: fonts.bold, color: GOLD });
    page.drawText(states[i].sub, { x: cx + 12, y: y - 34, size: 8, font: fonts.regular, color: GOLD });
    drawBodyColor(page, fonts, states[i].text, cx + 12, y - 52, colW - 24, WHITE, 9, 13);
  }

  y -= colH + 20;

  // Line density explanation
  page.drawRectangle({ x: MARGIN, y: y - 100, width: CONTENT_W, height: 100, color: LIGHT_GRAY });
  page.drawText("The Horizontal Line Density Method", { x: MARGIN + 16, y: y - 20, size: 11, font: fonts.bold, color: BLACK });
  drawBody(page, fonts, "All artwork is expressed as horizontal black lines on light concrete. Line density - how close together the lines are - creates the image. Dense lines read as dark. Sparse lines read as light. No curves, no diagonals, no fills. The same visual language across all three states makes each transformation feel inevitable.", MARGIN + 16, y - 38, CONTENT_W - 32, 9, 13);

  drawPageFooter(page, fonts, 3, 16);
}

function renderThreeStates(page: PDFPage, fonts: Fonts) {
  let y = drawHeaderBar(page, fonts, "THE THREE STATE SYSTEM - VISUAL DEMONSTRATION");

  page.drawText("Skull Scenario - S1", { x: MARGIN, y, size: 20, font: fonts.bold, color: BLACK });
  y -= 14;
  page.drawText("Ocean Waves > Solar Disc > Skull", { x: MARGIN, y, size: 10, font: fonts.regular, color: MID_GRAY });
  y -= 8;
  drawRule(page, y, GOLD, 1.5);
  y -= 16;

  const scenario = SCENARIOS["skull"];
  if (!scenario) return;

  const canvasH = 120;
  const canvasW = CONTENT_W;

  // Side A
  drawLineCanvas(page, MARGIN, y - canvasH, canvasW, canvasH, scenario.densityA, 32);
  y -= canvasH + 4;
  page.drawText("SIDE A - OCEAN WAVES", { x: MARGIN, y, size: 8, font: fonts.bold, color: GOLD });
  page.drawText("All 32 slats facing forward", { x: MARGIN + 180, y, size: 8, font: fonts.regular, color: MID_GRAY });
  y -= 20;

  // Side B
  drawLineCanvas(page, MARGIN, y - canvasH, canvasW, canvasH, scenario.densityB, 32);
  y -= canvasH + 4;
  page.drawText("SIDE B - SOLAR DISC", { x: MARGIN, y, size: 8, font: fonts.bold, color: GOLD });
  page.drawText("All 32 slats rotated 180°", { x: MARGIN + 180, y, size: 8, font: fonts.regular, color: MID_GRAY });
  y -= 20;

  // Emergent
  const emergentFn = (yFrac: number, xFrac: number) => {
    const slatIdx = Math.floor(xFrac * 32);
    const isOdd = slatIdx % 2 === 0;
    const bgFn = isOdd ? scenario.densityA : scenario.densityB;
    return Math.max(0, Math.min(1, bgFn(yFrac, xFrac) * 0.25 + scenario.densityC(yFrac, xFrac) * 0.85));
  };
  drawLineCanvas(page, MARGIN, y - canvasH, canvasW, canvasH, emergentFn, 32);
  y -= canvasH + 4;
  page.drawText("ALTERNATING - SKULL EMERGES", { x: MARGIN, y, size: 8, font: fonts.bold, color: GOLD });
  page.drawText("Odd slats Side A + Even slats Side B", { x: MARGIN + 220, y, size: 8, font: fonts.regular, color: MID_GRAY });

  drawPageFooter(page, fonts, 4, 16);
}

function renderScenarioPage(page: PDFPage, fonts: Fonts, scenarioId: string, pageNum: number) {
  const scenario = SCENARIOS[scenarioId];
  const copy = SCENARIO_COPY[scenarioId];
  const meta = SCENARIO_LIST.find((s) => s.id === scenarioId);
  if (!scenario || !copy || !meta) return;

  const idx = SCENARIO_LIST.findIndex((s) => s.id === scenarioId) + 1;
  let y = drawHeaderBar(page, fonts, "SCENARIO LIBRARY", `S${idx} - ${meta.label.toUpperCase()}`);

  // Hero section
  const heroH = 160;
  drawDarkPanel(page, 0, y - heroH, PAGE_W, heroH);

  page.drawText(scenario.emergentLabel, { x: MARGIN, y: y - 30, size: 28, font: fonts.bold, color: WHITE });
  page.drawText(`${scenario.sideALabel} + ${scenario.sideBLabel}`, { x: MARGIN, y: y - 50, size: 14, font: fonts.regular, color: GOLD });

  // Mini canvases
  const miniW = 80;
  const miniH = 50;
  const miniX = PAGE_W - MARGIN - miniW * 3 - 16;
  const miniY = y - heroH + 20;
  drawLineCanvas(page, miniX, miniY, miniW, miniH, scenario.densityA, 16);
  page.drawText("A", { x: miniX + miniW + 4, y: miniY + 20, size: 8, font: fonts.bold, color: GOLD });
  drawLineCanvas(page, miniX + miniW + 16, miniY, miniW, miniH, scenario.densityB, 16);
  page.drawText("B", { x: miniX + miniW * 2 + 20, y: miniY + 20, size: 8, font: fonts.bold, color: GOLD });

  y -= heroH + 16;

  // Three columns
  const colW = (CONTENT_W - 16) / 3;
  const cols = [
    { gold: "SIDE A", bold: scenario.sideALabel, text: copy.sideADesc },
    { gold: "SIDE B", bold: scenario.sideBLabel, text: copy.sideBDesc },
    { gold: "STATE 3", bold: `${scenario.emergentLabel} Revealed`, text: copy.emergentDesc },
  ];

  for (let i = 0; i < 3; i++) {
    const cx = MARGIN + i * (colW + 8);
    page.drawText(cols[i].gold, { x: cx, y, size: 8, font: fonts.bold, color: GOLD });
    page.drawText(cols[i].bold, { x: cx, y: y - 16, size: 11, font: fonts.bold, color: BLACK });
    drawBody(page, fonts, cols[i].text, cx, y - 34, colW - 8, 9, 13);
  }

  y -= 120;

  // Concept
  page.drawRectangle({ x: MARGIN, y: y - 100, width: CONTENT_W, height: 100, color: LIGHT_GRAY });
  drawGoldLabel(page, fonts, "CONCEPTUAL MEANING", MARGIN + 12, y - 16);
  drawBody(page, fonts, copy.concept, MARGIN + 12, y - 32, CONTENT_W - 24, 9, 13);

  drawPageFooter(page, fonts, pageNum, 16);
}

function renderSKUPage(page: PDFPage, fonts: Fonts, skuIdx: number, pageNum: number) {
  const sku = SKU_DATA[skuIdx];
  if (!sku) return;

  let y = drawHeaderBar(page, fonts, "SKU SPECIFICATIONS", sku.sku);

  // Left half
  const leftW = CONTENT_W * 0.5;
  page.drawText(sku.sku, { x: MARGIN, y, size: 11, font: fonts.bold, color: GOLD });
  y -= 28;
  page.drawText(sku.title.split(" ")[0], { x: MARGIN, y, size: 28, font: fonts.bold, color: BLACK });
  y -= 32;
  page.drawText(sku.title.split(" ").slice(1).join(" "), { x: MARGIN, y, size: 28, font: fonts.bold, color: BLACK });
  y -= 24;
  y = drawBody(page, fonts, sku.desc, MARGIN, y, leftW - 20);

  // Right half - spec panel
  const panelX = MARGIN + leftW + 10;
  const panelW = CONTENT_W - leftW - 10;
  const panelY = y + 40;
  const panelH = 260;
  drawDarkPanel(page, panelX, panelY - panelH + 200, panelW, panelH);

  let py = panelY + 180;
  const specs = [
    ["SKU", sku.sku],
    ["SLAT COUNT", String(sku.slatCount)],
    ["SLAT WIDTH", '9" (228.6mm)'],
    ["WALL WIDTH", `${sku.widthFt} feet`],
    ["WALL HEIGHT", `${sku.heightFt} feet`],
    ["PRINT AREA", `${sku.printArea} sq ft total`],
    ["LEAD TIME", sku.leadTime],
    ["WARRANTY", "2 years parts and labor"],
  ];
  for (const [label, value] of specs) {
    page.drawText(label, { x: panelX + 12, y: py, size: 7, font: fonts.regular, color: GOLD });
    py -= 14;
    page.drawText(value, { x: panelX + 12, y: py, size: 11, font: fonts.bold, color: WHITE });
    py -= 18;
  }

  // What's included
  const inclY = panelY - panelH + 170;
  page.drawText("WHAT IS INCLUDED", { x: MARGIN, y: inclY, size: 11, font: fonts.bold, color: BLACK });
  drawRule(page, inclY - 6, GOLD, 1);

  const leftItems = [
    `${sku.slatCount} GFRC concrete slats fabricated`,
    `Cast-in steel insert blocks (${sku.slatCount * 2} total)`,
    `Welded steel U-brackets (${sku.slatCount * 2} total)`,
    `Pivot shafts top and bottom (${sku.slatCount * 2} total)`,
    `Top bearing assemblies (${sku.slatCount} sealed)`,
    `Bottom passive bearings (${sku.slatCount})`,
    `Low-voltage geared motors (${sku.slatCount})`,
    `Reduction drives (${sku.slatCount})`,
  ];
  const rightItems = [
    `Wiring harness per slat (${sku.slatCount})`,
    `Integrated sensors (${sku.slatCount})`,
    "Master control system (1)",
    "Mounting frame system",
    "UV print artwork both faces",
    "Engineering and design",
    "Project management",
    "Installation and commissioning",
  ];

  let iy = inclY - 22;
  for (const item of leftItems) {
    page.drawText(`*  ${item}`, { x: MARGIN, y: iy, size: 8, font: fonts.regular, color: BLACK });
    iy -= 13;
  }
  iy = inclY - 22;
  for (const item of rightItems) {
    page.drawText(`*  ${item}`, { x: MARGIN + CONTENT_W / 2, y: iy, size: 8, font: fonts.regular, color: BLACK });
    iy -= 13;
  }

  // Investment bar
  const barY = 58;
  drawDarkPanel(page, MARGIN, barY, CONTENT_W, 40);
  page.drawText("STARTING INVESTMENT", { x: MARGIN + 16, y: barY + 16, size: 11, font: fonts.bold, color: GOLD });
  const pw = fonts.bold.widthOfTextAtSize(sku.price, 22);
  page.drawText(sku.price, { x: MARGIN + CONTENT_W / 2 - pw / 2, y: barY + 10, size: 22, font: fonts.bold, color: WHITE });

  drawPageFooter(page, fonts, pageNum, 16);
}

function renderCustomConfig(page: PDFPage, fonts: Fonts) {
  let y = drawHeaderBar(page, fonts, "CUSTOM CONFIGURATION");

  page.drawText("Your wall. Your dimensions. Your artwork.", { x: MARGIN, y, size: 20, font: fonts.bold, color: BLACK });
  y -= 18;
  y = drawBody(page, fonts, "The SW-01 system can be configured to any slat count, any wall width, and any wall height. Custom artwork scenarios beyond the five standard library options are available by commission.", MARGIN, y, CONTENT_W);
  y -= 16;

  const colW = (CONTENT_W - 16) / 3;
  const options = [
    { gold: "ANY SIZE", text: "Slat count from 8 to 64. Wall width from 6 feet to 48 feet. Wall height from 7 feet to 16 feet. Slat width standardized at 9 inches for optimal artwork resolution." },
    { gold: "BESPOKE SCENARIOS", text: "Commission a custom artwork set - three images designed specifically for your space and brand. Custom Side A, Side B, and emergent image designed in collaboration. Additional design fee applies." },
    { gold: "MATERIAL OPTIONS", text: "Standard GFRC concrete in natural gray. Pigmented GFRC in custom tones. Polished or honed surface finish options. Custom aggregate exposure for premium texture." },
  ];

  for (let i = 0; i < 3; i++) {
    const cx = MARGIN + i * (colW + 8);
    page.drawText(options[i].gold, { x: cx, y, size: 11, font: fonts.bold, color: GOLD });
    drawBody(page, fonts, options[i].text, cx, y - 18, colW - 8, 9, 13);
  }

  y -= 120;

  // Process steps
  page.drawRectangle({ x: MARGIN, y: y - 200, width: CONTENT_W, height: 200, color: LIGHT_GRAY });
  page.drawText("How to commission a custom installation", { x: MARGIN + 16, y: y - 18, size: 14, font: fonts.bold, color: BLACK });

  const steps = [
    "Submit your wall dimensions and project brief",
    "Receive preliminary configuration and pricing",
    "Select or commission artwork scenarios",
    "Engineering review and structural sign-off",
    "Fabrication begins - milestone payments",
    "Print production and quality review",
    "Installation and commissioning",
    "Two-year warranty period begins",
  ];
  let sy = y - 40;
  for (let i = 0; i < steps.length; i++) {
    page.drawText(`0${i + 1}`, { x: MARGIN + 16, y: sy, size: 10, font: fonts.bold, color: GOLD });
    page.drawText(` -  ${steps[i]}`, { x: MARGIN + 40, y: sy, size: 10, font: fonts.regular, color: BLACK });
    sy -= 18;
  }

  drawPageFooter(page, fonts, 13, 16);
}

function renderTechSpecs(page: PDFPage, fonts: Fonts) {
  let y = drawHeaderBar(page, fonts, "TECHNICAL SPECIFICATIONS - SW-01 SYSTEM");

  const sections: [string, [string, string][]][] = [
    ["SLAT CONSTRUCTION", [
      ["Material", "Glass Fiber Reinforced Concrete (GFRC)"],
      ["Slat width", '228.6mm (9 inches)'],
      ["Slat thickness", "38mm (1.5 inches)"],
      ["Finish face", "Matte sealed concrete - UV printable"],
      ["End connection", "Cast-in steel insert block"],
    ]],
    ["ROTATION HARDWARE", [
      ["Connection bracket", "Welded steel U-channel - galvanized"],
      ["Rotation axis", "Vertical center axis - rod and bearing"],
      ["Top pivot", "Steel shaft - motor coupled"],
      ["Bottom pivot", "Straight steel rod - passive bearing"],
      ["Bearing service", "Removable access panel - tool-free"],
    ]],
    ["DRIVE SYSTEM", [
      ["Motor type", "Low-voltage geared motor - 24V DC"],
      ["Reduction drive", "Inline reduction - 40:1 ratio"],
      ["Rotation range", "0° to 180° - software limited"],
      ["Rotation speed", "Adjustable - 5 to 60 seconds"],
      ["Control system", "Master controller - all slats synced"],
    ]],
    ["ARTWORK SYSTEM", [
      ["Print method", "UV flatbed ink - sealed concrete"],
      ["Line weight", "0.75mm uniform throughout"],
      ["Artwork system", "Horizontal line density - no curves"],
      ["Color", "Black ink - white/concrete ground"],
      ["Faces per slat", "2 - Side A and Side B"],
    ]],
    ["WARRANTY", [
      ["Warranty period", "2 years parts and labor"],
      ["Motor warranty", "5 years - manufacturer backed"],
      ["Concrete warranty", "10 years - material defects"],
      ["Service interval", "Annual inspection recommended"],
      ["Remote diagnostics", "Available via control system"],
    ]],
  ];

  for (const [sectionTitle, rows] of sections) {
    page.drawText(sectionTitle, { x: MARGIN, y, size: 9, font: fonts.bold, color: GOLD });
    y -= 4;
    page.drawRectangle({ x: MARGIN, y, width: CONTENT_W, height: 0.5, color: GOLD });
    y -= 14;

    for (let i = 0; i < rows.length; i++) {
      drawSpecRow(page, fonts, rows[i][0], rows[i][1], MARGIN, y, CONTENT_W, i % 2 === 0);
      y -= 16;
    }
    y -= 8;
  }

  drawPageFooter(page, fonts, 14, 16);
}

function renderInvestment(page: PDFPage, fonts: Fonts, input: ProposalInput, calcResult: SlatWallCalcResult) {
  let y = drawHeaderBar(page, fonts, "INVESTMENT SUMMARY - YOUR PROJECT");

  // Config summary panel
  const panelH = 140;
  drawDarkPanel(page, MARGIN, y - panelH, CONTENT_W, panelH);
  const scenarioMeta = SCENARIO_LIST.find((s) => s.id === input.scenarioId);

  const configPairs: [string, string][] = [
    ["SCENARIO", scenarioMeta?.label ?? input.scenarioId],
    ["SLAT COUNT", String(input.slatCount)],
    ["WALL WIDTH", `${calcResult.inputs.wallWidthFt} feet`],
    ["WALL HEIGHT", `${input.slatHeightFt} feet`],
    ["PRINT METHOD", input.printMethod === "uv" ? "UV Flatbed" : "Physical Stencil"],
    ["INSTALLATION", input.includeInstall ? "Included" : "Not included"],
  ];

  let py = y - 16;
  const colW2 = CONTENT_W / 3;
  for (let i = 0; i < configPairs.length; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const cx = MARGIN + 16 + col * colW2;
    const cy = py - row * 50;
    page.drawText(configPairs[i][0], { x: cx, y: cy, size: 7, font: fonts.regular, color: GOLD });
    page.drawText(configPairs[i][1], { x: cx, y: cy - 16, size: 12, font: fonts.bold, color: WHITE });
  }

  y -= panelH + 20;

  // Client-friendly breakdown
  const { breakdown, pricing } = calcResult;
  const fabMaterials = breakdown.materialsSlats + breakdown.materialsFixed + breakdown.materialsShipping;
  const artworkProd = breakdown.printTotal;
  const engDesign = breakdown.laborEngineering + breakdown.laborProjectMgmt;
  const install = breakdown.laborInstall + breakdown.laborCommission;
  const fabricationLabor = breakdown.laborFabrication + breakdown.laborPrint;

  page.drawText("INVESTMENT BREAKDOWN", { x: MARGIN, y, size: 11, font: fonts.bold, color: BLACK });
  y -= 6;
  drawRule(page, y, GOLD, 1);
  y -= 20;

  const clientLines: [string, number][] = [
    ["Fabrication and materials", fabMaterials + fabricationLabor],
    ["Artwork production and print", artworkProd],
    ["Engineering and design", engDesign],
  ];
  if (input.includeInstall) {
    clientLines.push(["Installation and commissioning", install]);
  }

  for (const [label, val] of clientLines) {
    page.drawText(label, { x: MARGIN, y, size: 10, font: fonts.regular, color: BLACK });
    const vStr = `$${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const vw = fonts.regular.widthOfTextAtSize(vStr, 10);
    page.drawText(vStr, { x: MARGIN + CONTENT_W - vw, y, size: 10, font: fonts.regular, color: BLACK });
    y -= 18;
  }
  page.drawRectangle({ x: MARGIN, y: y + 4, width: CONTENT_W, height: 1, color: BLACK });
  y -= 4;

  // Total
  const totalLabel = "Total investment";
  page.drawText(totalLabel, { x: MARGIN, y, size: 11, font: fonts.bold, color: BLACK });
  const totalStr = `$${pricing.studioPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const tw = fonts.bold.widthOfTextAtSize(totalStr, 14);
  page.drawText(totalStr, { x: MARGIN + CONTENT_W - tw, y: y - 2, size: 14, font: fonts.bold, color: BLACK });
  y -= 30;

  // Gold total bar
  page.drawRectangle({ x: MARGIN, y: y - 40, width: CONTENT_W, height: 40, color: GOLD });
  page.drawText("TOTAL INVESTMENT", { x: MARGIN + 16, y: y - 26, size: 14, font: fonts.bold, color: DARK });
  const bigTotal = `$${pricing.studioPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const btw = fonts.bold.widthOfTextAtSize(bigTotal, 28);
  page.drawText(bigTotal, { x: MARGIN + CONTENT_W - btw - 16, y: y - 30, size: 28, font: fonts.bold, color: DARK });
  y -= 56;

  // Payment schedule
  page.drawText("PAYMENT SCHEDULE", { x: MARGIN, y, size: 11, font: fonts.bold, color: GOLD });
  y -= 6;
  drawRule(page, y, GOLD, 1);
  y -= 18;

  const total = pricing.studioPrice;
  const m1 = Math.round(total * 0.3 / 100) * 100;
  const m2 = Math.round(total * 0.3 / 100) * 100;
  const m3 = Math.round(total * 0.2 / 100) * 100;
  const m4 = total - m1 - m2 - m3;

  const milestones = [
    [`Milestone 1: Contract signing - 30%`, `$${m1.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
    [`Milestone 2: Fabrication start - 30%`, `$${m2.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
    [`Milestone 3: Print approval - 20%`, `$${m3.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
    [`Milestone 4: Installation complete - 20%`, `$${m4.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
  ];
  for (const [label, val] of milestones) {
    page.drawText(label, { x: MARGIN, y, size: 9, font: fonts.regular, color: BLACK });
    const mw = fonts.bold.widthOfTextAtSize(val, 9);
    page.drawText(val, { x: MARGIN + CONTENT_W - mw, y, size: 9, font: fonts.bold, color: BLACK });
    y -= 16;
  }

  y -= 10;
  y = drawBody(page, fonts, "This proposal is valid for 30 days from the date of issue. Pricing is subject to site survey confirmation. All prices are in USD and exclude applicable sales tax.", MARGIN, y, CONTENT_W, 8, 12);

  // Lead time
  let leadTime = "10-14 weeks";
  if (input.slatCount <= 16) leadTime = "8-10 weeks";
  else if (input.slatCount >= 48) leadTime = "14-18 weeks";
  y -= 4;
  page.drawText(`Estimated lead time from contract execution: ${leadTime} to installation complete.`, { x: MARGIN, y, size: 9, font: fonts.bold, color: BLACK });

  drawPageFooter(page, fonts, 15, 16);
}

function renderBackCover(page: PDFPage, fonts: Fonts) {
  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: DARK });

  const cx = PAGE_W / 2;

  // RB mark
  page.drawRectangle({ x: cx - 30, y: PAGE_H / 2 + 100, width: 60, height: 80, borderColor: WHITE, borderWidth: 1.5, color: DARK });
  centerText(page, "R", PAGE_H / 2 + 140, 36, fonts.bold, WHITE);
  page.drawRectangle({ x: cx - 22, y: PAGE_H / 2 + 132, width: 44, height: 1.5, color: WHITE });
  page.drawRectangle({ x: cx - 22, y: PAGE_H / 2 + 127, width: 44, height: 1.5, color: WHITE });
  centerText(page, "B", PAGE_H / 2 + 103, 36, fonts.bold, WHITE);

  centerText(page, "S T U D I O", PAGE_H / 2 + 80, 8, fonts.regular, GOLD);
  page.drawRectangle({ x: cx - 60, y: PAGE_H / 2 + 70, width: 120, height: 1, color: GOLD });

  // Contact
  let y = PAGE_H / 2 + 40;
  const contacts = [
    ["STUDIO", "RB Studio"],
    ["EMAIL", "hello@rbstudio.com"],
    ["WEB", "www.rbstudio.com"],
    ["INSTAGRAM", "@rbstudio"],
  ];
  for (const [label, value] of contacts) {
    centerText(page, label, y, 8, fonts.bold, GOLD);
    y -= 16;
    centerText(page, value, y, 12, fonts.bold, WHITE);
    y -= 24;
  }

  page.drawRectangle({ x: cx - 60, y: y + 8, width: 120, height: 1, color: GOLD });

  // Copyright
  centerText(page, "(c) 2026 RB Studio - All rights reserved", 60, 7, fonts.regular, MID_GRAY);
  centerText(page, "SW-01 Rotating Slat Wall System is proprietary technology developed by RB Studio", 48, 7, fonts.regular, MID_GRAY);
}

// ─── AI-ENHANCED THREE STATES PAGE ─────────────────────────

async function embedImage(pdfDoc: PDFDocument, url: string) {
  const bytes = await fetchImageBytes(url);
  if (!bytes) return null;
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

async function renderThreeStatesWithAI(
  pdfDoc: PDFDocument,
  fonts: Fonts,
  aiImages: Record<string, string>,
) {
  const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let y = drawHeaderBar(page, fonts, "YOUR PROJECT - THREE STATE VISUALIZATION");

  page.drawText("Your Installation - Three States", { x: MARGIN, y, size: 20, font: fonts.bold, color: BLACK });
  y -= 16;
  drawRule(page, y, GOLD, 1.5);
  y -= 16;

  const imgH = 180;
  const labels: [string, string, string][] = [
    ["A", "SIDE A - ALL SLATS FORWARD", "All slats face forward showing Side A artwork"],
    ["B", "SIDE B - ALL SLATS ROTATED 180", "All slats rotated showing Side B artwork"],
    ["C", "EMERGENT - ALTERNATING SLATS", "Odd slats Side A + Even slats Side B reveals hidden image"],
  ];

  for (const [state, label, desc] of labels) {
    const url = aiImages[state];
    if (!url) continue;

    const img = await embedImage(pdfDoc, url);
    if (!img) continue;

    const aspect = img.width / img.height;
    const finalH = Math.min(imgH, (PAGE_H - 200) / 3 - 30);
    const finalW = Math.min(CONTENT_W, finalH * aspect);

    page.drawImage(img, {
      x: MARGIN + (CONTENT_W - finalW) / 2,
      y: y - finalH,
      width: finalW,
      height: finalH,
    });
    y -= finalH + 4;
    page.drawText(label, { x: MARGIN, y, size: 8, font: fonts.bold, color: GOLD });
    const dw = fonts.regular.widthOfTextAtSize(desc, 8);
    page.drawText(desc, { x: MARGIN + CONTENT_W - dw, y, size: 8, font: fonts.regular, color: MID_GRAY });
    y -= 18;
  }

  drawPageFooter(page, fonts, 4, 12);
}

async function renderScenarioPageWithAI(
  pdfDoc: PDFDocument,
  fonts: Fonts,
  scenarioId: string,
  aiImages: Record<string, string>,
) {
  const scenario = SCENARIOS[scenarioId];
  const copy = SCENARIO_COPY[scenarioId];
  const meta = SCENARIO_LIST.find((s) => s.id === scenarioId);
  if (!scenario || !copy || !meta) return;

  const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  const idx = SCENARIO_LIST.findIndex((s) => s.id === scenarioId) + 1;
  let y = drawHeaderBar(page, fonts, "YOUR SCENARIO", `S${idx} - ${meta.label.toUpperCase()}`);

  // Hero with AI images
  const heroH = 200;
  drawDarkPanel(page, 0, y - heroH, PAGE_W, heroH);

  page.drawText(scenario.emergentLabel, { x: MARGIN, y: y - 30, size: 28, font: fonts.bold, color: WHITE });
  page.drawText(`${scenario.sideALabel} + ${scenario.sideBLabel}`, { x: MARGIN, y: y - 50, size: 14, font: fonts.regular, color: GOLD });

  // Embed AI renders in hero area
  const thumbW = 120;
  const thumbH = 70;
  let tx = PAGE_W - MARGIN - thumbW * 3 - 20;

  for (const [state, label] of [["A", "A"], ["B", "B"], ["C", "EMERGENT"]] as const) {
    const url = aiImages[state];
    if (!url) { tx += thumbW + 8; continue; }

    const img = await embedImage(pdfDoc, url);
    if (img) {
      const aspect = img.width / img.height;
      const tw = Math.min(thumbW, thumbH * aspect);
      const th = tw / aspect;
      page.drawImage(img, { x: tx, y: y - heroH + 20, width: tw, height: th });
      page.drawText(label, { x: tx + tw + 4, y: y - heroH + 40, size: 8, font: fonts.bold, color: GOLD });
    }
    tx += thumbW + 8;
  }

  y -= heroH + 16;

  // Three columns
  const colW = (CONTENT_W - 16) / 3;
  const cols = [
    { gold: "SIDE A", bold: scenario.sideALabel, text: copy.sideADesc },
    { gold: "SIDE B", bold: scenario.sideBLabel, text: copy.sideBDesc },
    { gold: "STATE 3", bold: `${scenario.emergentLabel} Revealed`, text: copy.emergentDesc },
  ];

  for (let i = 0; i < 3; i++) {
    const cx = MARGIN + i * (colW + 8);
    page.drawText(cols[i].gold, { x: cx, y, size: 8, font: fonts.bold, color: GOLD });
    page.drawText(cols[i].bold, { x: cx, y: y - 16, size: 11, font: fonts.bold, color: BLACK });
    drawBody(page, fonts, cols[i].text, cx, y - 34, colW - 8, 9, 13);
  }

  y -= 120;

  // Concept
  page.drawRectangle({ x: MARGIN, y: y - 100, width: CONTENT_W, height: 100, color: LIGHT_GRAY });
  drawGoldLabel(page, fonts, "CONCEPTUAL MEANING", MARGIN + 12, y - 16);
  drawBody(page, fonts, copy.concept, MARGIN + 12, y - 32, CONTENT_W - 24, 9, 13);

  drawPageFooter(page, fonts, 5, 12);
}

// ─── AI RENDERS PAGE ───────────────────────────────────────

async function fetchImageBytes(url: string): Promise<Uint8Array | null> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const buf = await resp.arrayBuffer();
    return new Uint8Array(buf);
  } catch {
    return null;
  }
}

async function renderAiImagesPage(
  pdfDoc: PDFDocument,
  fonts: Fonts,
  aiImages: Record<string, string>,
  pageNum: number,
) {
  const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let y = drawHeaderBar(page, fonts, "YOUR PROJECT - AI GENERATED RENDERS");

  page.drawText("Generated Artwork Renders", { x: MARGIN, y, size: 20, font: fonts.bold, color: BLACK });
  y -= 16;
  y = drawBody(page, fonts, "These renders were generated specifically for your project using the RB Studio AI visualization system. They represent the artwork that will be printed on the slat wall installation.", MARGIN, y, CONTENT_W, 10, 15);
  y -= 12;

  const labels: Record<string, string> = {
    A: "SIDE A - ALL SLATS FORWARD",
    B: "SIDE B - ALL SLATS ROTATED 180",
    C: "EMERGENT - ALTERNATING SLATS",
  };

  for (const state of ["A", "B", "C"] as const) {
    const url = aiImages[state];
    if (!url) continue;

    const bytes = await fetchImageBytes(url);
    if (!bytes) continue;

    try {
      const img = await pdfDoc.embedPng(bytes);
      const imgW = CONTENT_W;
      const imgH = imgW * (img.height / img.width);
      const maxH = 180;
      const finalH = Math.min(imgH, maxH);
      const finalW = finalH * (img.width / img.height);

      drawGoldLabel(page, fonts, labels[state] ?? `STATE ${state}`, MARGIN, y);
      y -= 6;

      page.drawImage(img, {
        x: MARGIN + (CONTENT_W - finalW) / 2,
        y: y - finalH,
        width: finalW,
        height: finalH,
      });
      y -= finalH + 16;
    } catch {
      // If PNG embed fails, try JPEG
      try {
        const img = await pdfDoc.embedJpg(bytes);
        const imgW = CONTENT_W;
        const imgH = imgW * (img.height / img.width);
        const maxH = 180;
        const finalH = Math.min(imgH, maxH);
        const finalW = finalH * (img.width / img.height);

        drawGoldLabel(page, fonts, labels[state] ?? `STATE ${state}`, MARGIN, y);
        y -= 6;

        page.drawImage(img, {
          x: MARGIN + (CONTENT_W - finalW) / 2,
          y: y - finalH,
          width: finalW,
          height: finalH,
        });
        y -= finalH + 16;
      } catch {
        // Skip image if it can't be embedded
      }
    }
  }

  drawPageFooter(page, fonts, pageNum, 17);
}

// ─── MAIN GENERATOR ────────────────────────────────────────

export async function generateProposalPDF(input: ProposalInput): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(`RB Studio Proposal - ${input.proposalNumber}`);
  pdfDoc.setAuthor("RB Studio");
  pdfDoc.setCreator("RB Studio Proposal Generator");
  pdfDoc.setCreationDate(new Date());

  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const oblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const fonts: Fonts = { regular, bold, oblique };

  // Calculate pricing
  const calcResult = calculateSlatWallCost({
    slatCount: input.slatCount,
    slatWidthIn: input.slatWidthIn,
    slatHeightFt: input.slatHeightFt,
    printMethod: input.printMethod,
    includeInstall: input.includeInstall,
  });

  // Page 1 - Cover
  renderCover(pdfDoc.addPage([PAGE_W, PAGE_H]), fonts, input);

  // Page 2 - Intro
  renderIntroPage(pdfDoc.addPage([PAGE_W, PAGE_H]), fonts);

  // Page 3 - System Overview
  renderSystemOverview(pdfDoc.addPage([PAGE_W, PAGE_H]), fonts);

  // Page 4 - Three States (with AI images if available)
  const hasAiImages = input.aiImages && Object.keys(input.aiImages).length > 0;
  if (hasAiImages) {
    await renderThreeStatesWithAI(pdfDoc, fonts, input.aiImages!);
  } else {
    renderThreeStates(pdfDoc.addPage([PAGE_W, PAGE_H]), fonts);
  }

  // Page 5 - Selected Scenario only (with AI images if available)
  if (hasAiImages) {
    await renderScenarioPageWithAI(pdfDoc, fonts, input.scenarioId, input.aiImages!);
  } else {
    renderScenarioPage(pdfDoc.addPage([PAGE_W, PAGE_H]), fonts, input.scenarioId, 5);
  }

  // SKU Specs - only the matching size + custom
  let pageNum = 6;
  for (let i = 0; i < 3; i++) {
    renderSKUPage(pdfDoc.addPage([PAGE_W, PAGE_H]), fonts, i, pageNum++);
  }

  // Custom Config
  renderCustomConfig(pdfDoc.addPage([PAGE_W, PAGE_H]), fonts);
  pageNum++;

  // Tech Specs
  renderTechSpecs(pdfDoc.addPage([PAGE_W, PAGE_H]), fonts);
  pageNum++;

  // Investment
  renderInvestment(pdfDoc.addPage([PAGE_W, PAGE_H]), fonts, input, calcResult);
  pageNum++;

  // Back Cover
  renderBackCover(pdfDoc.addPage([PAGE_W, PAGE_H]), fonts);

  return pdfDoc.save();
}
