import type { Sku } from "../schemas/sku";
import type { SkuCategory } from "../schemas/domain";

export type TechnicalDrawingType = "dimensions" | "cross_sections" | "mold_assembly";

export type TechnicalDrawingPrompt = {
  drawingType: TechnicalDrawingType;
  sectionKey: string;
  promptText: string;
};

function fmt(n: number) {
  return Number.isInteger(n) ? `${n}` : `${n}`.replace(/\.0+$/, "");
}

const drawingSectionKeyMap: Record<SkuCategory, Partial<Record<TechnicalDrawingType, string>>> = {
  VESSEL_SINK: {
    dimensions: "dimensions",
    cross_sections: "datum-system",
    mold_assembly: "mold-system",
  },
  FURNITURE: {
    dimensions: "dimensions",
    cross_sections: "rib-structure",
    mold_assembly: "mold-system",
  },
  PANEL: {
    dimensions: "dimensions",
    mold_assembly: "mold-prep",
  },
  WALL_TILE: {
    dimensions: "dimensions",
    mold_assembly: "mold-prep",
  },
  HARD_GOOD: {
    dimensions: "dimensions",
  },
};

const DRAWING_STYLE_PREFIX =
  "Generate a high-quality black-and-white technical engineering line drawing on a pure white background. Use clean black lines, standard engineering drawing conventions, dimension callout lines with values, section hatching for cut views, dashed lines for hidden edges, and thin centerlines for symmetry axes. No color, no shading, no gradients, no perspective — strictly 2D orthographic projection. Include a title block in the lower-right corner with: the RB Studio logo mark (a vertically stacked R over B inside a thin rectangular border, with \"STUDIO\" in spaced uppercase tracking below), SKU code, part name, weight range, and drawing type.";

function buildSinkDimensionsPrompt(sku: Sku): string {
  return `${DRAWING_STYLE_PREFIX}

Subject: Dimensioned orthographic views of a GFRC architectural vessel sink.
SKU: ${sku.code} — ${sku.name}

Show THREE orthographic views arranged in standard first-angle projection:

TOP VIEW (plan):
- Outer rectangle ${fmt(sku.outerLength)}" x ${fmt(sku.outerWidth)}" with dimension callouts
- Inner basin outline ${fmt(sku.innerLength)}" x ${fmt(sku.innerWidth)}" shown as hidden dashed lines
- Centered drain opening ${fmt(sku.drainDiameter)}" diameter with centerlines on Datum B/C intersection
- Reinforcement zone ${fmt(sku.reinforcementDiameter)}" diameter shown dashed around drain
- ${fmt(sku.longRibCount)} longitudinal ribs and ${fmt(sku.crossRibCount)} cross rib(s) shown as dashed lines

FRONT ELEVATION (side view):
- Outer height ${fmt(sku.outerHeight)}" with dimension callout
- Top lip thickness ${fmt(sku.topLipThickness)}"
- Wall thickness ${fmt(sku.wallThickness)}" visible at edges
- Bottom thickness ${fmt(sku.bottomThickness)}" at base
- Draft angle ${fmt(sku.draftAngle)}° indicated on vertical faces

SECTION VIEW (cut through centerline A-A):
- Full cross-section showing wall profile, basin cavity, and hollow core
- Inner basin depth ${fmt(sku.innerDepth)}" with dimension callout
- Hollow core depth ${fmt(sku.hollowCoreDepth)}"
- Rib cross-sections ${fmt(sku.ribWidth)}" wide x ${fmt(sku.ribHeight)}" tall
- Corner radius ${fmt(sku.cornerRadius)}" at internal transitions
- Section hatching on cut concrete surfaces

Title block: SKU ${sku.code} | ${sku.name} | ${fmt(sku.targetWeight.min)}-${fmt(sku.targetWeight.max)} lbs | DIMENSIONED VIEWS`;
}

function buildSinkCrossSectionsPrompt(sku: Sku): string {
  return `${DRAWING_STYLE_PREFIX}

Subject: Detailed cross-section and transition drawings for a GFRC vessel sink.
SKU: ${sku.code} — ${sku.name}

Show 6 detail callout views arranged on one sheet:

DETAIL 1: WALL THICKNESS TRANSITION
- Cross-section showing ${fmt(sku.wallThickness)}" wall meeting ${fmt(sku.bottomThickness)}" base
- Smooth radius transition at ${fmt(sku.cornerRadius)}" fillet
- Section hatching on concrete

DETAIL 2: RIB CONNECTION
- Cross-section of rib (${fmt(sku.ribWidth)}" wide x ${fmt(sku.ribHeight)}" tall) bonding to shell wall
- ${fmt(sku.cornerRadius)}" radius fillet at base connection
- Show ${fmt(sku.longRibCount)} longitudinal ribs and ${fmt(sku.crossRibCount)} cross rib arrangement

DETAIL 3: HOLLOW CORE
- Section through hollow core cavity showing ${fmt(sku.hollowCoreDepth)}" depth
- Dome rise ${fmt(sku.domeRiseMin)}"-${fmt(sku.domeRiseMax)}" on top surface
- Drain opening ${fmt(sku.drainDiameter)}" diameter with ${fmt(sku.reinforcementDiameter)}" reinforcement zone

DETAIL 4: TOP LIP EDGE
- Cross-section of ${fmt(sku.topLipThickness)}" top lip
- Wall-to-lip transition detail
- Inner wall tie-in

DETAIL 5: MOLD INTERFACE
- Exploded cross-section showing basin core inside outer mold box
- Basin core offset creating ${fmt(sku.wallThickness)}" wall gap
- Draft angle ${fmt(sku.draftAngle)}° on vertical faces
- Assembly direction arrow (downward)

DETAIL 6: DRAIN CROSS-SECTION
- Drain insert at ${fmt(sku.drainDiameter)}" through bottom
- Reinforcement ring ${fmt(sku.reinforcementDiameter)}" x ${fmt(sku.reinforcementThickness)}" thick
- Taper transition from reinforcement to standard wall

Title block: SKU ${sku.code} | ${sku.name} | ${fmt(sku.targetWeight.min)}-${fmt(sku.targetWeight.max)} lbs | DETAILED CROSS-SECTIONS`;
}

function buildSinkMoldAssemblyPrompt(sku: Sku): string {
  return `${DRAWING_STYLE_PREFIX}

Subject: Mold system assembly drawing for a GFRC vessel sink.
SKU: ${sku.code} — ${sku.name}

Show an EXPLODED AXONOMETRIC VIEW of the complete mold system with components separated vertically and labeled:

COMPONENT 1 (bottom): OUTER MOLD BOX
- Rectangular rigid form, interior dimensions slightly larger than ${fmt(sku.outerLength)}" x ${fmt(sku.outerWidth)}" x ${fmt(sku.outerHeight)}"
- ${fmt(sku.draftAngle)}° inward draft on all vertical faces
- Label: "OUTER MOLD BOX (RECTANGULAR RIGID FORM)"

COMPONENT 2 (floating above): INNER BASIN CORE
- Organic erosion-shaped sculpted insert
- Creates the interior basin geometry ${fmt(sku.innerLength)}" x ${fmt(sku.innerWidth)}" x ${fmt(sku.innerDepth)}" deep
- Shows ${fmt(sku.wallThickness)}" gap to outer mold when assembled
- Label: "INNER BASIN CORE (ORGANIC EROSION SHAPE)"

COMPONENT 3: HOLLOW CORE INSERT
- Domed underside, fits between basin core and outer mold base
- Creates ${fmt(sku.hollowCoreDepth)}" cavity
- Label: "HOLLOW CORE INSERT (DOMED UNDERSIDE)"

COMPONENT 4: RIB-FORMING INSERTS
- ${fmt(sku.longRibCount)} longitudinal + ${fmt(sku.crossRibCount)} cross rib insert strips
- ${fmt(sku.ribWidth)}" wide x ${fmt(sku.ribHeight)}" tall
- Label: "RIB-FORMING INSERTS"

COMPONENT 5 (top): DRAIN KNOCKOUT INSERT
- Centered on Datum B/C intersection
- ${fmt(sku.drainDiameter)}" diameter
- Label: "DRAIN KNOCKOUT INSERT"

Show assembly direction arrows (downward sequence), parting lines between components, and a side reference view showing the assembled cross-section with dimension callouts.

Title block: SKU ${sku.code} | ${sku.name} | ${fmt(sku.targetWeight.min)}-${fmt(sku.targetWeight.max)} lbs | MOLD SYSTEM ASSEMBLY`;
}

function buildFurnitureDimensionsPrompt(sku: Sku): string {
  return `${DRAWING_STYLE_PREFIX}

Subject: Dimensioned orthographic views of a GFRC architectural furniture piece.
SKU: ${sku.code} — ${sku.name}

Show THREE orthographic views:

TOP VIEW (plan):
- Outer rectangle ${fmt(sku.outerLength)}" x ${fmt(sku.outerWidth)}" with dimension callouts
- Hollow core outline ${fmt(sku.innerLength)}" x ${fmt(sku.innerWidth)}" shown dashed
- Internal rib grid: ${fmt(sku.longRibCount)} longitudinal x ${fmt(sku.crossRibCount)} cross ribs shown dashed
- Centerlines on Datum B and C

FRONT ELEVATION:
- Full height ${fmt(sku.outerHeight)}" with dimension callout
- Wall thickness ${fmt(sku.wallThickness)}" visible at edges
- Bottom thickness ${fmt(sku.bottomThickness)}" at base
- Top thickness ${fmt(sku.topLipThickness)}" at top
- Draft angle ${fmt(sku.draftAngle)}°
- Corner radius ${fmt(sku.cornerRadius)}"

SECTION VIEW (cut through center):
- Hollow core cavity ${fmt(sku.hollowCoreDepth)}" deep
- Rib cross-sections ${fmt(sku.ribWidth)}" x ${fmt(sku.ribHeight)}"
- Shell thickness visible on all faces
- Section hatching on cut surfaces

Title block: SKU ${sku.code} | ${sku.name} | ${fmt(sku.targetWeight.min)}-${fmt(sku.targetWeight.max)} lbs | DIMENSIONED VIEWS`;
}

function buildFurnitureCrossSectionsPrompt(sku: Sku): string {
  return `${DRAWING_STYLE_PREFIX}

Subject: Internal structure cross-sections for a GFRC furniture piece.
SKU: ${sku.code} — ${sku.name}

Show 4 detail views:

DETAIL 1: SHELL WALL SECTION
- Wall thickness ${fmt(sku.wallThickness)}" with dimension callout
- Bottom ${fmt(sku.bottomThickness)}", Top ${fmt(sku.topLipThickness)}"
- Corner radius ${fmt(sku.cornerRadius)}" at transitions

DETAIL 2: RIB GRID SECTION
- ${fmt(sku.longRibCount)} longitudinal x ${fmt(sku.crossRibCount)} cross ribs
- Rib dimensions ${fmt(sku.ribWidth)}" wide x ${fmt(sku.ribHeight)}" tall
- Rib-to-shell bonding detail with fillet radius

DETAIL 3: HOLLOW CORE CAVITY
- Full section showing ${fmt(sku.hollowCoreDepth)}" hollow core depth
- Shell surrounding cavity on all sides
- Rib intersections within cavity

DETAIL 4: EDGE DETAIL
- Corner radius ${fmt(sku.cornerRadius)}" at all external edges
- Draft angle ${fmt(sku.draftAngle)}° on mold-facing surfaces
- Surface finish indication

Title block: SKU ${sku.code} | ${sku.name} | ${fmt(sku.targetWeight.min)}-${fmt(sku.targetWeight.max)} lbs | CROSS-SECTIONS`;
}

function buildFurnitureMoldAssemblyPrompt(sku: Sku): string {
  return `${DRAWING_STYLE_PREFIX}

Subject: Mold system assembly for a GFRC furniture piece.
SKU: ${sku.code} — ${sku.name}

Show an EXPLODED AXONOMETRIC VIEW:

COMPONENT 1 (bottom): OUTER MOLD BOX
- Interior cavity slightly larger than ${fmt(sku.outerLength)}" x ${fmt(sku.outerWidth)}" x ${fmt(sku.outerHeight)}"
- ${fmt(sku.draftAngle)}° draft on vertical faces

COMPONENT 2: CORE INSERT
- Creates hollow interior ${fmt(sku.innerLength)}" x ${fmt(sku.innerWidth)}" x ${fmt(sku.innerDepth)}"
- Maintains ${fmt(sku.wallThickness)}" gap to outer mold

COMPONENT 3: RIB-FORMING INSERTS
- ${fmt(sku.longRibCount)} longitudinal + ${fmt(sku.crossRibCount)} cross rib strips
- ${fmt(sku.ribWidth)}" wide x ${fmt(sku.ribHeight)}" tall

Show assembly direction arrows, parting lines, and a side section reference view.

Title block: SKU ${sku.code} | ${sku.name} | ${fmt(sku.targetWeight.min)}-${fmt(sku.targetWeight.max)} lbs | MOLD ASSEMBLY`;
}

function buildPanelDimensionsPrompt(sku: Sku): string {
  return `${DRAWING_STYLE_PREFIX}

Subject: Dimensioned views of a GFRC wall tile or panel module.
SKU: ${sku.code} — ${sku.name}

Show THREE views:

FACE VIEW (front):
- Module face ${fmt(sku.outerLength)}" x ${fmt(sku.outerWidth)}" with dimension callouts
- Texture pattern indication (surface relief lines)
- Centerlines on Datum B

EDGE SECTION (side):
- Total thickness ${fmt(sku.outerHeight)}" with dimension callout
- Edge radius ${fmt(sku.cornerRadius)}" on all edges
- Draft angle ${fmt(sku.draftAngle)}° on side faces
- Section hatching showing solid GFRC cross-section

MULTI-MODULE LAYOUT:
- Show 4-6 modules arranged in running bond pattern
- Joint spacing indicated (3/8" typical)
- Overall pattern dimensions
- Alignment reference to Datum B

Title block: SKU ${sku.code} | ${sku.name} | ${fmt(sku.targetWeight.min)}-${fmt(sku.targetWeight.max)} lbs | MODULE DIMENSIONS`;
}

function buildPanelMoldAssemblyPrompt(sku: Sku): string {
  return `${DRAWING_STYLE_PREFIX}

Subject: Mold tray assembly for GFRC tile or panel production.
SKU: ${sku.code} — ${sku.name}

Show an EXPLODED VIEW of the casting setup:

COMPONENT 1 (bottom): MOLD TRAY
- Flat level tray, interior sized for multiple ${fmt(sku.outerLength)}" x ${fmt(sku.outerWidth)}" modules
- Grid dividers creating individual module cavities

COMPONENT 2: TEXTURE LINER
- Silicone or rubber mat that seats flat into tray
- Creates the face texture pattern
- Must be wrinkle-free

COMPONENT 3: THICKNESS GAUGE STRIPS
- Positioned at ${fmt(sku.outerHeight)}" height at corners and center of each module
- Used as screed guides during backing layer application

Show assembly direction arrows, a side section view showing layer buildup (liner → face coat → backing), and thickness callout ${fmt(sku.outerHeight)}".

Title block: SKU ${sku.code} | ${sku.name} | ${fmt(sku.targetWeight.min)}-${fmt(sku.targetWeight.max)} lbs | MOLD TRAY ASSEMBLY`;
}

const promptBuilders: Record<SkuCategory, Partial<Record<TechnicalDrawingType, (sku: Sku) => string>>> = {
  VESSEL_SINK: {
    dimensions: buildSinkDimensionsPrompt,
    cross_sections: buildSinkCrossSectionsPrompt,
    mold_assembly: buildSinkMoldAssemblyPrompt,
  },
  FURNITURE: {
    dimensions: buildFurnitureDimensionsPrompt,
    cross_sections: buildFurnitureCrossSectionsPrompt,
    mold_assembly: buildFurnitureMoldAssemblyPrompt,
  },
  PANEL: {
    dimensions: buildPanelDimensionsPrompt,
    mold_assembly: buildPanelMoldAssemblyPrompt,
  },
  WALL_TILE: {
    dimensions: buildPanelDimensionsPrompt,
    mold_assembly: buildPanelMoldAssemblyPrompt,
  },
  HARD_GOOD: {},
};

export function buildTechnicalDrawingPrompts(sku: Sku & { category: SkuCategory }): TechnicalDrawingPrompt[] {
  const builders = promptBuilders[sku.category] ?? {};
  const sectionKeys = drawingSectionKeyMap[sku.category] ?? {};

  return (Object.entries(builders) as [TechnicalDrawingType, (sku: Sku) => string][]).map(
    ([drawingType, builder]) => ({
      drawingType,
      sectionKey: sectionKeys[drawingType] ?? drawingType,
      promptText: builder(sku),
    }),
  );
}
