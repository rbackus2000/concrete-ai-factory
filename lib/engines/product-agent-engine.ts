import type { Sku } from "../schemas/sku";

// ── Output Types ──────────────────────────────────────────────

export type GeneratedSkuData = {
  code: string;
  name: string;
  slug: string;
  category: "VESSEL_SINK" | "FURNITURE" | "PANEL" | "WALL_TILE";
  type: string;
  finish: string;
  summary: string;
  targetWeight: { min: number; max: number };
  outerLength: number;
  outerWidth: number;
  outerHeight: number;
  innerLength: number;
  innerWidth: number;
  innerDepth: number;
  wallThickness: number;
  bottomThickness: number;
  topLipThickness: number;
  hollowCoreDepth: number;
  domeRiseMin: number;
  domeRiseMax: number;
  longRibCount: number;
  crossRibCount: number;
  ribWidth: number;
  ribHeight: number;
  drainDiameter: number;
  drainType: string;
  basinSlopeDeg: number;
  slopeDirection: string;
  mountType: string;
  hasOverflow: boolean;
  overflowHoleDiameter: number;
  overflowPosition: string;
  bracketSpec: {
    bracketModel: string;
    bracketCount: number;
    bracketToCenter: string;
    wallType: string;
    channelWidthIn: number;
    channelDepthIn: number;
    channelLengthIn: number;
    channelSpacingFromCenter: string;
    hardwareBom: Array<{ item: string; qty: string; notes?: string }>;
    installNotes: string;
  } | null;
  reinforcementDiameter: number;
  reinforcementThickness: number;
  draftAngle: number;
  cornerRadius: number;
  fiberPercent: number;
  datumSystem: Array<{ name: string; description: string }>;
  calculatorDefaults: {
    batchSizeLbs: number;
    mixType: string;
    waterLbs: number;
    plasticizerGrams: number;
    fiberPercent: number;
    colorIntensityPercent: number;
    unitsToProduce: number;
    weightPerUnitLbs: number;
    wasteFactor: number;
    autoBatchSizeLbs: number;
    scaleFactor: number;
    pigmentGrams: number;
  };
};

export type GeneratedBuildPacketSection = {
  sectionKey: string;
  name: string;
  sectionOrder: number;
  content: string;
};

export type GeneratedMaterial = {
  code: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  unitCost: number;
  notes: string;
};

export type GeneratedQcChecklist = {
  templateKey: string;
  name: string;
  category: "SETUP" | "PRE_DEMOLD" | "POST_DEMOLD" | "ALIGNMENT";
  checklist: string[];
  acceptanceCriteria: string[];
  rejectionCriteria: string[];
};

export type ProductBundle = {
  sku: GeneratedSkuData;
  buildPacketSections: GeneratedBuildPacketSection[];
  materials: GeneratedMaterial[];
  qcChecklists: GeneratedQcChecklist[];
  imagePrompts: string[];
};

// ── System Prompt Builder ─────────────────────────────────────

export function buildProductAgentSystemPrompt(exampleSkus: Sku[]): string {
  const exampleJson = exampleSkus.map((sku) => ({
    code: sku.code,
    name: sku.name,
    category: sku.category,
    type: sku.type,
    finish: sku.finish,
    summary: sku.summary,
    outerLength: sku.outerLength,
    outerWidth: sku.outerWidth,
    outerHeight: sku.outerHeight,
    innerLength: sku.innerLength,
    innerWidth: sku.innerWidth,
    innerDepth: sku.innerDepth,
    wallThickness: sku.wallThickness,
    bottomThickness: sku.bottomThickness,
    topLipThickness: sku.topLipThickness,
    drainDiameter: sku.drainDiameter,
    drainType: sku.drainType,
    mountType: sku.mountType,
    hasOverflow: sku.hasOverflow,
    bracketSpec: sku.bracketSpec,
    fiberPercent: sku.fiberPercent,
    draftAngle: sku.draftAngle,
    cornerRadius: sku.cornerRadius,
    calculatorDefaults: sku.calculatorDefaults,
  }));

  return `You are the RB Studio Product Engineer Agent. You create complete GFRC (Glass Fiber Reinforced Concrete) product specifications for a concrete manufacturing factory.

COMPANY CONTEXT:
RB Studio manufactures architectural GFRC products — vessel sinks, ramp sinks, countertops, furniture (tables, benches, planters), and wall panels/tiles. Products are cast in custom molds using GFRC (face coat + fiber-reinforced backer), then ground, polished, sealed, and optionally UV-printed.

YOUR TASK:
Given a product design prompt, generate a COMPLETE product data bundle in JSON. The output must match the exact structure of existing products.

EXISTING PRODUCT EXAMPLES (for reference):
${JSON.stringify(exampleJson, null, 2)}

SKU CODE CONVENTIONS:
- Vessel sinks: S{N}-{NAME} (e.g. S1-EROSION, S2-CANYON)
- Furniture: F{N}-{NAME} (e.g. F1-MONOLITH, F2-SLAB)
- Countertops: C{N}-{NAME} (e.g. C1-SLAB)
- Panels: P{N}-{NAME} (e.g. P1-RIDGE, P2-DUNE)

CATEGORIES: VESSEL_SINK, FURNITURE, PANEL, WALL_TILE

MOUNT TYPES:
- WALL_MOUNT_STUD — sinks/countertops with bracket channels cast in underside
- VESSEL_TOP_MOUNT — bowls that sit on a cabinet (no brackets)
- FREESTANDING — furniture pieces
- WALL_ADHESIVE — panels/tiles attached with adhesive

DRAIN TYPES: Round, Slot, Grid, or "" (no drain)

BRACKET MODELS (for wall-mount only):
- FSB-L-S (small sinks <20")
- FSB-L (standard sinks 20-36")
- FSB-L-XL (countertops 60"+)
Channel dimensions: 1.25-1.75" wide x 0.75-1" deep x 11-20" long

OVERFLOW: All wall-mount sinks and countertops with basins get hasOverflow: true, 1.25" diameter hole in rear basin wall.

ALL DIMENSIONS ARE IN INCHES. All weights in pounds.

STANDARD WALL THICKNESS: 0.5-0.6" for sinks, 0.75-1.5" for furniture
STANDARD BOTTOM THICKNESS: 0.5-0.75" for sinks, 1.5-2" for furniture
STANDARD INNER DEPTH: 5" for sinks (industry standard)
STANDARD FIBER PERCENT: 0.025 for sinks, 0.03 for furniture, 0.02 for panels
STANDARD DRAFT ANGLE: 3 degrees for sinks, 2 degrees for furniture/panels

BUILD PACKET SECTIONS (generate 8-12):
overview, dimensions, datum-system, mold-system, wall-structure, rib-structure, assembly, casting, qc, draft-release, demold, failure-points

Use {{tokens}} in build packet content: {{skuCode}}, {{productName}}, {{finish}}, {{type}}, {{targetWeight}}, {{outerDimensions}}, {{innerDimensions}}, {{wallThickness}}, {{bottomThickness}}, {{topLipThickness}}, {{drainDiameter}}, {{drainType}}, {{draftAngle}}, {{cornerRadius}}, {{fiberPercent}}, {{longRibCount}}, {{crossRibCount}}, {{ribWidth}}, {{ribHeight}}, {{hollowCoreDepth}}, {{bracketCount}}, {{channelDimensions}}, {{channelSpacingFromCenter}}, {{overflowHoleDiameter}}, {{overflowPosition}}, {{mountType}}

MATERIALS: Generate 6-10 materials (GFRC backing, face coat, fiber, pigment, drain kit, sealer, packaging, plus hardware for wall-mount).

QC CHECKLISTS: Generate 3 — SETUP, PRE_DEMOLD, POST_DEMOLD. Include mounting channel and overflow checks for wall-mount sinks.

IMAGE PROMPTS: Generate 3-5 descriptive prompts for product visualization (lifestyle, detail, installed, blueprint-style).

RESPOND WITH VALID JSON ONLY — no markdown fencing, no explanation text. Just the JSON object matching the ProductBundle type.`;
}

// ── User Prompt Builder ───────────────────────────────────────

export function buildProductAgentUserPrompt(designPrompt: string, existingCodes: string[]): string {
  return `Create a complete product specification for the following design:

${designPrompt}

IMPORTANT:
- The SKU code must NOT conflict with these existing codes: ${existingCodes.join(", ")}
- Pick the next available number in the appropriate series
- All measurements in inches, weights in pounds
- Be precise with geometry — these dimensions drive real mold fabrication
- The summary should be 2-3 sentences describing the product's design language and key features
- Calculator defaults should be realistic for the product's weight and complexity

Generate the complete ProductBundle JSON.`;
}
