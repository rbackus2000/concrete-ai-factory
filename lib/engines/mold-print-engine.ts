/**
 * Mold Print Engine
 *
 * Pure business logic for 3D-printed mold planning:
 * - Section splitting for Ender-5 Max build volume
 * - Slicing spec generation (sink vs tile defaults)
 * - Print time estimation
 *
 * No database access — accepts typed records, returns computed results.
 */

// Ender-5 Max build volume in mm
const BUILD_VOLUME_MM = { x: 400, y: 400, z: 400 };
const INCHES_TO_MM = 25.4;

export type MoldDimensions = {
  outerLength: number; // inches
  outerWidth: number;  // inches
  outerHeight: number; // inches
  category: "VESSEL_SINK" | "FURNITURE" | "PANEL" | "WALL_TILE";
};

export type SectionPlan = {
  totalSections: number;
  fitsInOnePrint: boolean;
  sections: SectionDetail[];
  bondingNotes: string;
  moldDimensionsMm: { length: number; width: number; height: number };
};

export type SectionDetail = {
  sectionNumber: number;
  lengthMm: number;
  widthMm: number;
  heightMm: number;
  orientation: string;
  printTimeMins: number;
};

export type SlicingSpec = {
  layerHeightMm: number;
  wallCount: number;
  infillPercent: number;
  supportsEnabled: boolean;
  supportType: string;
  orientation: string;
  adhesionType: string;
  estimatedPrintTimeHours: number;
  postPrintNotes: string[];
  nozzleDiameterMm: number;
  printTempC: number;
  bedTempC: number;
  printSpeedMmS: number;
};

function inchesToMm(inches: number): number {
  return inches * INCHES_TO_MM;
}

function estimatePrintTimeMins(
  lengthMm: number,
  widthMm: number,
  heightMm: number,
  layerHeight: number,
  infill: number,
  isSolid: boolean = false,
): number {
  const layers = Math.ceil(heightMm / layerHeight);
  const perimeterMm = 2 * (lengthMm + widthMm);
  const wallCount = isSolid ? 4 : 3;
  const printSpeedMmS = 50;
  const nozzleWidth = 0.4;
  const fullArea = lengthMm * widthMm;

  if (isSolid) {
    // Solid forms (tiles, panels): bulk printed at 0.2mm, top 2mm at fine layer height
    // Use 0.2mm for the estimate since that's ~90% of layers
    const effectiveLayerH = 0.2;
    const effectiveLayers = Math.ceil(heightMm / effectiveLayerH);
    const infillLength = (fullArea * (infill / 100)) / nozzleWidth;
    const layerTimeSec = (perimeterMm * wallCount + infillLength) / printSpeedMmS;
    return Math.round((effectiveLayers * layerTimeSec * 0.55) / 60);
  }

  // Shell molds (sinks, furniture): base plate is solid, upper layers are just walls
  const baseLayers = Math.min(Math.ceil(8 / layerHeight), layers);
  const shellLayers = layers - baseLayers;

  const baseInfillLength = (fullArea * (infill / 100)) / nozzleWidth;
  const baseLayerTimeSec = (perimeterMm * wallCount + baseInfillLength) / printSpeedMmS;

  const moldWallMm = 12;
  const innerLength = Math.max(0, lengthMm - 2 * moldWallMm);
  const innerWidth = Math.max(0, widthMm - 2 * moldWallMm);
  const shellRingArea = fullArea - innerLength * innerWidth;
  const shellInfillLength = (shellRingArea * (infill / 100)) / nozzleWidth;
  const shellLayerTimeSec = (perimeterMm * wallCount + shellInfillLength) / printSpeedMmS;

  const rawSec = baseLayers * baseLayerTimeSec + shellLayers * shellLayerTimeSec;
  return Math.round((rawSec * 0.65) / 60);
}

export function calculateSectionPlan(dims: MoldDimensions): SectionPlan {
  const lengthMm = inchesToMm(dims.outerLength);
  const widthMm = inchesToMm(dims.outerWidth);
  const isTile = dims.category === "WALL_TILE";
  const isPanel = dims.category === "PANEL";
  const isSolid = isTile || isPanel;
  // Tiles/panels: no mold base plate needed (the print IS the form)
  // Sinks/furniture: add 20mm base plate
  const heightMm = inchesToMm(dims.outerHeight) + (isSolid ? 0 : 20);

  const moldDimensionsMm = {
    length: Math.round(lengthMm),
    width: Math.round(widthMm),
    height: Math.round(heightMm),
  };

  // 10mm tolerance: parts barely over 400mm can usually fit with minor bed adjustment
  const TOLERANCE = 10;
  const buildX = BUILD_VOLUME_MM.x + TOLERANCE;
  const buildY = BUILD_VOLUME_MM.y + TOLERANCE;
  const buildZ = BUILD_VOLUME_MM.z;

  // Tiles/panels: solid forms, use tile slicing settings
  if (isSolid) {
    const fitsL = lengthMm <= buildX;
    const fitsW = widthMm <= buildY;

    if (fitsL && fitsW) {
      const printTime = estimatePrintTimeMins(lengthMm, widthMm, heightMm, 0.1, 30, true);
      return {
        totalSections: 1,
        fitsInOnePrint: true,
        sections: [{
          sectionNumber: 1,
          lengthMm: moldDimensionsMm.length,
          widthMm: moldDimensionsMm.width,
          heightMm: moldDimensionsMm.height,
          orientation: "Texture face UP",
          printTimeMins: printTime,
        }],
        bondingNotes: "Single print — no bonding required.",
        moldDimensionsMm,
      };
    }

    // Split tile/panel
    const lSections = fitsL ? 1 : Math.ceil(lengthMm / BUILD_VOLUME_MM.x);
    const wSections = fitsW ? 1 : Math.ceil(widthMm / BUILD_VOLUME_MM.y);
    const secL = lengthMm / lSections;
    const secW = widthMm / wSections;
    const sections: SectionDetail[] = [];
    let num = 1;
    for (let li = 0; li < lSections; li++) {
      for (let wi = 0; wi < wSections; wi++) {
        sections.push({
          sectionNumber: num++,
          lengthMm: Math.round(secL),
          widthMm: Math.round(secW),
          heightMm: moldDimensionsMm.height,
          orientation: "Texture face UP",
          printTimeMins: estimatePrintTimeMins(secL, secW, heightMm, 0.1, 30, true),
        });
      }
    }
    return {
      totalSections: sections.length,
      fitsInOnePrint: false,
      sections,
      bondingNotes: `Split into ${sections.length} sections. Bond with 2-part epoxy, fill seams, sand with 220 grit, seal with XTC-3D.`,
      moldDimensionsMm,
    };
  }

  // Sinks and furniture: shell molds
  const fitsLength = lengthMm <= buildX;
  const fitsWidth = widthMm <= buildY;
  const fitsHeight = heightMm <= buildZ;

  if (fitsLength && fitsWidth && fitsHeight) {
    const printTime = estimatePrintTimeMins(lengthMm, widthMm, heightMm, 0.2, 15);
    return {
      totalSections: 1,
      fitsInOnePrint: true,
      sections: [{
        sectionNumber: 1,
        lengthMm: moldDimensionsMm.length,
        widthMm: moldDimensionsMm.width,
        heightMm: moldDimensionsMm.height,
        orientation: "Basin opening UP",
        printTimeMins: printTime,
      }],
      bondingNotes: "Single print — no bonding required.",
      moldDimensionsMm,
    };
  }

  // Need to split — determine axis
  const sections: SectionDetail[] = [];
  let bondingNotes: string;

  if (!fitsLength && fitsWidth && fitsHeight) {
    // Split along length only
    const sectionsNeeded = Math.ceil(lengthMm / BUILD_VOLUME_MM.x);
    const sectionLength = lengthMm / sectionsNeeded;
    for (let i = 0; i < sectionsNeeded; i++) {
      sections.push({
        sectionNumber: i + 1,
        lengthMm: Math.round(sectionLength),
        widthMm: moldDimensionsMm.width,
        heightMm: moldDimensionsMm.height,
        orientation: "Cut face down, basin UP",
        printTimeMins: estimatePrintTimeMins(sectionLength, widthMm, heightMm, 0.2, 15),
      });
    }
    bondingNotes = `Split along length axis into ${sectionsNeeded} sections. Bond with 2-part epoxy along seams. Fill, sand with 220 grit, seal with XTC-3D before silicone pour.`;
  } else if (fitsLength && !fitsWidth) {
    // Split along width
    const sectionsNeeded = Math.ceil(widthMm / BUILD_VOLUME_MM.y);
    const sectionWidth = widthMm / sectionsNeeded;
    for (let i = 0; i < sectionsNeeded; i++) {
      sections.push({
        sectionNumber: i + 1,
        lengthMm: moldDimensionsMm.length,
        widthMm: Math.round(sectionWidth),
        heightMm: moldDimensionsMm.height,
        orientation: "Cut face down, basin UP",
        printTimeMins: estimatePrintTimeMins(lengthMm, sectionWidth, heightMm, 0.2, 15),
      });
    }
    bondingNotes = `Split along width axis into ${sectionsNeeded} sections. Bond with 2-part epoxy along seams. Fill, sand with 220 grit, seal with XTC-3D before silicone pour.`;
  } else {
    // Split along both axes
    const lengthSections = Math.ceil(lengthMm / BUILD_VOLUME_MM.x);
    const widthSections = Math.ceil(widthMm / BUILD_VOLUME_MM.y);
    const sectionLength = lengthMm / lengthSections;
    const sectionWidth = widthMm / widthSections;
    let sectionNum = 1;
    for (let li = 0; li < lengthSections; li++) {
      for (let wi = 0; wi < widthSections; wi++) {
        sections.push({
          sectionNumber: sectionNum++,
          lengthMm: Math.round(sectionLength),
          widthMm: Math.round(sectionWidth),
          heightMm: moldDimensionsMm.height,
          orientation: "Cut face down, basin UP",
          printTimeMins: estimatePrintTimeMins(sectionLength, sectionWidth, heightMm, 0.2, 15),
        });
      }
    }
    bondingNotes = `Split into ${sections.length} sections (${lengthSections}x${widthSections} grid). Bond with 2-part epoxy. Fill all seams, sand with 220 grit, seal with XTC-3D before silicone pour.`;
  }

  return {
    totalSections: sections.length,
    fitsInOnePrint: false,
    sections,
    bondingNotes,
    moldDimensionsMm,
  };
}

export function generateSlicingSpec(dims: MoldDimensions, sectionPlan: SectionPlan): SlicingSpec {
  const isTile = dims.category === "WALL_TILE";
  const totalPrintTimeMins = sectionPlan.sections.reduce((sum, s) => sum + s.printTimeMins, 0);

  const isPanel = dims.category === "PANEL";
  if (isTile || isPanel) {
    return {
      layerHeightMm: 0.2,
      wallCount: 4,
      infillPercent: 30,
      supportsEnabled: false,
      supportType: "None",
      orientation: "Texture face UP",
      adhesionType: "Skirt",
      estimatedPrintTimeHours: Math.round((totalPrintTimeMins / 60) * 10) / 10,
      nozzleDiameterMm: 0.4,
      printTempC: 210,
      bedTempC: 60,
      printSpeedMmS: 50,
      postPrintNotes: [
        "Print bulk at 0.2mm — switch to 0.1mm for final 2mm (surface texture detail)",
        "Sand texture peaks lightly with 220 grit only",
        "Do NOT sand down ridges or channels",
        "Seal with XTC-3D before silicone pour",
        isTile ? "Tiles print flat — no supports needed" : "Panels print flat — no supports needed",
      ],
    };
  }

  return {
    layerHeightMm: 0.2,
    wallCount: 3,
    infillPercent: 15,
    supportsEnabled: true,
    supportType: "Tree supports (touching buildplate only)",
    orientation: "Basin opening UP",
    adhesionType: "Brim (8mm)",
    estimatedPrintTimeHours: Math.round((totalPrintTimeMins / 60) * 10) / 10,
    nozzleDiameterMm: 0.4,
    printTempC: 210,
    bedTempC: 60,
    printSpeedMmS: 50,
    postPrintNotes: [
      "Remove supports carefully — do not damage mold cavity surfaces",
      "Sand all mold surfaces with 220 grit for smooth GFRC cast finish",
      "Seal entire mold with XTC-3D (2-part epoxy coating) before silicone pour",
      sectionPlan.fitsInOnePrint
        ? "Single section — no bonding required"
        : `Bond ${sectionPlan.totalSections} sections with 2-part epoxy, fill seams, re-sand`,
    ],
  };
}
