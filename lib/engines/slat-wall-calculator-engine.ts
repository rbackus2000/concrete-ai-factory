/**
 * SW-01 Slat Wall Cost Calculator Engine
 * Pure business logic — no DB access
 */

// ─── DEFAULT UNIT COSTS ────────────────────────────────────

export type SlatWallUnitCosts = typeof DEFAULT_UNIT_COSTS;

export const DEFAULT_UNIT_COSTS = {
  // Materials — per slat
  gfrcSlabPerSlat: 180,
  steelInsertPerSlat: 45,
  uBracketPerSlat: 38,
  pivotShaftPerSlat: 22,
  topBearingPerSlat: 35,
  bottomBearingPerSlat: 28,
  motorPerSlat: 145,
  reductionDrivePerSlat: 65,
  wiringPerSlat: 18,
  sensorPerSlat: 24,

  // Materials — per wall (fixed)
  controlSystemPerWall: 2800,
  mountingFramePerLinFt: 120,
  powerSupplyPerWall: 180,
  enclosurePerWall: 240,

  // Print costs
  uvPrintPerSqFt: 12,
  stencilCutPerSlat: 55,
  stencilInkPerSlat: 18,
  artworkSetupPerWall: 350,

  // Labor rates ($/hr)
  fabricationRatePerHour: 85,
  printRatePerHour: 75,
  installRatePerHour: 95,
  engineeringRatePerHour: 150,

  // Labor hours — per slat
  fabricationHoursPerSlat: 3.5,
  printHoursPerSlat: 0.5,
  installHoursPerSlat: 1.8,

  // Labor hours — per wall (fixed)
  engineeringHoursPerWall: 12,
  commissioningHoursPerWall: 8,
  projectMgmtPercent: 0.08,

  // Overhead
  shippingPercent: 0.06,
  contingencyPercent: 0.10,

  // Margin
  studioMarkupPercent: 0.45,
};

// ─── WALL SIZE PRESETS ─────────────────────────────────────

export const WALL_PRESETS = {
  small: { label: "SW-SMALL", slatCount: 16, slatWidthIn: 9, slatHeightFt: 8 },
  standard: { label: "SW-STANDARD", slatCount: 32, slatWidthIn: 9, slatHeightFt: 10 },
  large: { label: "SW-LARGE", slatCount: 48, slatWidthIn: 9, slatHeightFt: 12 },
} as const;

export type WallPresetKey = keyof typeof WALL_PRESETS;

// ─── CALCULATOR INPUT ──────────────────────────────────────

export type SlatWallCalcInput = {
  slatCount: number;
  slatWidthIn: number;
  slatHeightFt: number;
  printMethod: "uv" | "stencil";
  includeInstall: boolean;
  costOverrides?: Partial<SlatWallUnitCosts>;
};

// ─── CALCULATOR RESULT ─────────────────────────────────────

export type SlatWallCalcResult = {
  inputs: {
    slatCount: number;
    slatWidthIn: number;
    slatHeightFt: number;
    wallWidthFt: number;
    totalPrintSqFt: number;
    printMethod: string;
    includeInstall: boolean;
  };
  breakdown: {
    materialsSlats: number;
    materialsFixed: number;
    materialsShipping: number;
    materialsTotal: number;
    printTotal: number;
    laborFabrication: number;
    laborPrint: number;
    laborInstall: number;
    laborEngineering: number;
    laborCommission: number;
    laborProjectMgmt: number;
    laborTotal: number;
    contingency: number;
    costToDeliver: number;
  };
  pricing: {
    studioPrice: number;
    pricePerSlat: number;
    pricePerSqFt: number;
    pricePerLinFt: number;
  };
  percentages: {
    materials: number;
    print: number;
    labor: number;
    contingency: number;
  };
  cards: Array<{ label: string; value: string; sub?: string }>;
};

// ─── PRINT COST FUNCTIONS ──────────────────────────────────

function uvPrintCost(
  slatWidthIn: number,
  slatHeightFt: number,
  slatCount: number,
  costs: SlatWallUnitCosts,
): number {
  const sqFtPerFace = (slatWidthIn / 12) * slatHeightFt;
  const totalSqFt = sqFtPerFace * 2 * slatCount;
  return totalSqFt * costs.uvPrintPerSqFt + costs.artworkSetupPerWall;
}

function stencilPrintCost(
  _slatWidthIn: number,
  _slatHeightFt: number,
  slatCount: number,
  costs: SlatWallUnitCosts,
): number {
  const perSlat = costs.stencilCutPerSlat + costs.stencilInkPerSlat;
  return perSlat * slatCount * 2 + costs.artworkSetupPerWall;
}

// ─── MAIN CALCULATOR ───────────────────────────────────────

function round(n: number): number {
  return Math.round(n);
}

function pct(part: number, total: number): number {
  if (total === 0) return 0;
  return parseFloat(((part / total) * 100).toFixed(1));
}

export function calculateSlatWallCost(input: SlatWallCalcInput): SlatWallCalcResult {
  const { slatCount, slatWidthIn, slatHeightFt, printMethod, includeInstall, costOverrides } = input;
  const costs: SlatWallUnitCosts = { ...DEFAULT_UNIT_COSTS, ...costOverrides };

  // Derived dimensions
  const wallWidthFt = (slatCount * slatWidthIn) / 12;
  const slatAreaSqFt = (slatWidthIn / 12) * slatHeightFt;
  const totalPrintSqFt = slatAreaSqFt * 2 * slatCount;

  // ── MATERIALS ─────────────────────────────────────────
  const materialsPerSlat =
    costs.gfrcSlabPerSlat +
    costs.steelInsertPerSlat +
    costs.uBracketPerSlat +
    costs.pivotShaftPerSlat +
    costs.topBearingPerSlat +
    costs.bottomBearingPerSlat +
    costs.motorPerSlat +
    costs.reductionDrivePerSlat +
    costs.wiringPerSlat +
    costs.sensorPerSlat;

  const materialsSlats = materialsPerSlat * slatCount;
  const materialsFixed =
    costs.controlSystemPerWall +
    costs.mountingFramePerLinFt * wallWidthFt +
    costs.powerSupplyPerWall +
    costs.enclosurePerWall;

  const materialsRaw = materialsSlats + materialsFixed;
  const materialsShipping = materialsRaw * costs.shippingPercent;
  const materialsTotal = materialsRaw + materialsShipping;

  // ── PRINT ─────────────────────────────────────────────
  const printTotal =
    printMethod === "uv"
      ? uvPrintCost(slatWidthIn, slatHeightFt, slatCount, costs)
      : stencilPrintCost(slatWidthIn, slatHeightFt, slatCount, costs);

  // ── LABOR ─────────────────────────────────────────────
  const laborFabrication = costs.fabricationHoursPerSlat * costs.fabricationRatePerHour * slatCount;
  const laborPrint = costs.printHoursPerSlat * 2 * costs.printRatePerHour * slatCount;
  const laborInstall = includeInstall ? costs.installHoursPerSlat * costs.installRatePerHour * slatCount : 0;
  const laborEngineering = costs.engineeringHoursPerWall * costs.engineeringRatePerHour;
  const laborCommission = includeInstall ? costs.commissioningHoursPerWall * costs.installRatePerHour : 0;

  const laborSubtotal = laborFabrication + laborPrint + laborInstall + laborEngineering + laborCommission;
  const laborProjectMgmt = laborSubtotal * costs.projectMgmtPercent;
  const laborTotal = laborSubtotal + laborProjectMgmt;

  // ── TOTALS ────────────────────────────────────────────
  const subtotal = materialsTotal + printTotal + laborTotal;
  const contingency = subtotal * costs.contingencyPercent;
  const costToDeliver = subtotal + contingency;
  const studioPrice = costToDeliver * (1 + costs.studioMarkupPercent);

  const pricePerSlat = slatCount > 0 ? studioPrice / slatCount : 0;
  const wallSqFt = wallWidthFt * slatHeightFt;
  const pricePerSqFt = wallSqFt > 0 ? studioPrice / wallSqFt : 0;
  const pricePerLinFt = wallWidthFt > 0 ? studioPrice / wallWidthFt : 0;

  const fmt = (n: number) => `$${n.toLocaleString()}`;

  return {
    inputs: {
      slatCount,
      slatWidthIn,
      slatHeightFt,
      wallWidthFt: parseFloat(wallWidthFt.toFixed(2)),
      totalPrintSqFt: parseFloat(totalPrintSqFt.toFixed(1)),
      printMethod,
      includeInstall,
    },
    breakdown: {
      materialsSlats: round(materialsSlats),
      materialsFixed: round(materialsFixed),
      materialsShipping: round(materialsShipping),
      materialsTotal: round(materialsTotal),
      printTotal: round(printTotal),
      laborFabrication: round(laborFabrication),
      laborPrint: round(laborPrint),
      laborInstall: round(laborInstall),
      laborEngineering: round(laborEngineering),
      laborCommission: round(laborCommission),
      laborProjectMgmt: round(laborProjectMgmt),
      laborTotal: round(laborTotal),
      contingency: round(contingency),
      costToDeliver: round(costToDeliver),
    },
    pricing: {
      studioPrice: round(studioPrice),
      pricePerSlat: round(pricePerSlat),
      pricePerSqFt: round(pricePerSqFt),
      pricePerLinFt: round(pricePerLinFt),
    },
    percentages: {
      materials: pct(materialsTotal, costToDeliver),
      print: pct(printTotal, costToDeliver),
      labor: pct(laborTotal, costToDeliver),
      contingency: pct(contingency, costToDeliver),
    },
    cards: [
      { label: "Client Price", value: fmt(round(studioPrice)), sub: "with 45% margin" },
      { label: "Cost to Deliver", value: fmt(round(costToDeliver)) },
      { label: "Per Slat", value: fmt(round(pricePerSlat)) },
      { label: "Per Sq Ft", value: fmt(round(pricePerSqFt)), sub: `${wallSqFt.toFixed(0)} sq ft wall` },
      { label: "Per Linear Ft", value: fmt(round(pricePerLinFt)), sub: `${wallWidthFt.toFixed(1)} ft wide` },
      { label: "Contingency", value: fmt(round(contingency)), sub: "10% buffer" },
    ],
  };
}
