export type SlatWallDrawingPrompt = {
  drawingType: string;
  promptText: string;
};

export type SlatWallProjectData = {
  code: string;
  name: string;
  clientName: string;
  location: string;
  designer: string;
  positionAName: string;
  positionBName: string;
  positionADescription: string;
  positionBDescription: string;
  config: {
    totalSlatCount: number;
    slatWidth: number;
    slatThickness: number;
    slatHeight: number;
    slatSpacing: number;
    supportFrameType: string;
    pivotType: string;
    rotationAngleA: number;
    rotationAngleB: number;
  };
};

export type SlatWallOutputType =
  | "IMAGE_RENDER_A"
  | "IMAGE_RENDER_B"
  | "IMAGE_RENDER_WALL"
  | "DETAIL_SHEET"
  | "BUILD_PACKET"
  | "CONCEPT";

export const slatWallOutputTypes: { value: SlatWallOutputType; label: string }[] = [
  { value: "IMAGE_RENDER_A", label: "Image Render — Position A" },
  { value: "IMAGE_RENDER_B", label: "Image Render — Position B" },
  { value: "IMAGE_RENDER_WALL", label: "Image Render — Full Wall Installation" },
  { value: "DETAIL_SHEET", label: "Detail Sheet" },
  { value: "BUILD_PACKET", label: "Build Packet (Text)" },
  { value: "CONCEPT", label: "Concept Visualization" },
];

function fmt(n: number) {
  return Number.isInteger(n) ? `${n}` : n.toFixed(2).replace(/\.?0+$/, "");
}

function wallWidthInches(project: SlatWallProjectData) {
  const c = project.config;
  return c.totalSlatCount * c.slatWidth + (c.totalSlatCount - 1) * c.slatSpacing;
}

function wallWidthFeet(project: SlatWallProjectData) {
  return (wallWidthInches(project) / 12).toFixed(1);
}

function heightFeet(project: SlatWallProjectData) {
  return (project.config.slatHeight / 12).toFixed(1);
}

function buildBaseContext(project: SlatWallProjectData) {
  const c = project.config;
  return `Project: ${project.code} — ${project.name}
Client: ${project.clientName || "RB Studio"}
Location: ${project.location || "TBD"}
System: Kinetic rotating vertical slat wall
Material: Thin GFRC architectural concrete slats with UV-printed artwork over sealed concrete
Slat count: ${c.totalSlatCount} slats
Slat dimensions: ${fmt(c.slatWidth)}" wide x ${fmt(c.slatHeight)}" tall (${heightFeet(project)} ft) x ${fmt(c.slatThickness)}" thick
Total wall width: ${fmt(wallWidthInches(project))}" (${wallWidthFeet(project)} ft)
Slat spacing: ${fmt(c.slatSpacing)}"
Support frame: ${c.supportFrameType || "Engineered aluminum top/bottom track"}
Pivot system: ${c.pivotType || "Concealed vertical pin pivot"}
Position A (${fmt(c.rotationAngleA)}°): "${project.positionAName}" — ${project.positionADescription || "Full-wall composite image A"}
Position B (${fmt(c.rotationAngleB)}°): "${project.positionBName}" — ${project.positionBDescription || "Full-wall composite image B"}`;
}

export function buildSlatWallPrompt(
  project: SlatWallProjectData,
  outputType: SlatWallOutputType,
  creativeDirection: string,
): string {
  const base = buildBaseContext(project);
  const c = project.config;

  switch (outputType) {
    case "IMAGE_RENDER_A":
    case "IMAGE_RENDER_B": {
      const isA = outputType === "IMAGE_RENDER_A";
      const posName = isA ? project.positionAName : project.positionBName;
      const posDesc = isA
        ? (project.positionADescription || project.positionAName)
        : (project.positionBDescription || project.positionBName);
      const posAngle = isA ? c.rotationAngleA : c.rotationAngleB;
      const posLabel = isA ? "A" : "B";
      const faceLabel = isA ? "Face A" : "Face B";

      return `Generate an ultra-realistic architectural render of a kinetic rotating slat wall in Position ${posLabel}, showing the complete "${posName}" composite image.

${base}

The image shows all ${c.totalSlatCount} slats rotated to Position ${posLabel} (${fmt(posAngle)}°), with each slat displaying its ${faceLabel} artwork slice. The complete wall reads as one unified large-format image: ${posDesc}.

The wall is ${wallWidthFeet(project)} feet wide by ${heightFeet(project)} feet tall. Each slat is ${fmt(c.slatWidth)}" wide thin GFRC concrete with UV-printed artwork over sealed matte concrete surface. Show the subtle vertical gaps (${fmt(c.slatSpacing)}") between slats — the image reads continuously despite the physical slat divisions.

CRITICAL — use these EXACT camera and environment settings for consistency between Position A and Position B renders:
- Camera: Centered on the wall, straight-on frontal view with very slight left perspective (approximately 5° off-axis). Camera positioned at 5 feet height, 20 feet from wall.
- Room: Large minimalist gallery space with polished concrete floor, smooth white/light gray walls, and a high ceiling (approximately 20 feet). The room is rectangular with the slat wall as the focal feature on the far wall.
- Lighting: Soft diffused overhead lighting from recessed ceiling panels. No harsh directional light. Even illumination across the full wall surface. Subtle floor reflection.
- Frame: Full wall visible with approximately 3 feet of floor visible below and 2 feet of ceiling above. Wall edges visible on both sides with 2 feet of room wall on each side.
- Support frame: Thin brushed aluminum top and bottom track visible, minimal profile.
- Wall proportions: The slat wall should fill approximately 70% of the image width, maintaining the exact ${wallWidthFeet(project)} ft x ${heightFeet(project)} ft proportions.
- The only difference between Position A and Position B renders is the artwork displayed on the slat faces.

Style: Premium, museum-quality, architecturally refined. Not a billboard — this is a kinetic art installation.

${creativeDirection}

Negative constraints: No billboard aesthetics. No chunky slats. No disconnected image slices. No generic signage. No fantasy mechanics. No dramatic camera angles. No colored lighting.

Footer: RB Studio | ${project.code}`;
    }

    case "IMAGE_RENDER_WALL":
      return `Generate a ultra-realistic architectural render showing the kinetic rotating slat wall installation in a mid-rotation transitional state — slats partially between Position A and Position B.

${base}

Show the wall mid-transition: some slats revealing fragments of "${project.positionAName}" (${project.positionADescription || "Image A"}), others showing "${project.positionBName}" (${project.positionBDescription || "Image B"}), and some at angle showing the thin concrete edge.

The transitional state should read as abstract vertical fragmentation — elegant and kinetic, not chaotic. The ${c.totalSlatCount} slats are each ${fmt(c.slatWidth)}" wide GFRC concrete. Show the support frame, pivot points, and the physical depth of the installation.

Environment: Premium architectural interior. Show a viewer or visitors to convey scale (wall is ${wallWidthFeet(project)} ft wide x ${heightFeet(project)} ft tall).

Style: Museum-quality kinetic art installation. Emphasize the engineering elegance and the visual drama of the transition.

${creativeDirection}

Negative constraints: No billboard aesthetics. No chunky construction. No magical floating slats. No generic signage.

Footer: RB Studio | ${project.code}`;

    case "CONCEPT":
      return `Generate a premium concept visualization for a kinetic rotating vertical slat wall installation.

${base}

Show a split composition:
LEFT HALF: The wall in Position A displaying "${project.positionAName}" — ${project.positionADescription || "complete composite image A"}
RIGHT HALF: The wall in Position B displaying "${project.positionBName}" — ${project.positionBDescription || "complete composite image B"}
CENTER: A subtle transition zone showing slats mid-rotation

Include small technical callouts:
- ${c.totalSlatCount} GFRC slats, ${fmt(c.slatWidth)}" x ${heightFeet(project)} ft x ${fmt(c.slatThickness)}"
- UV print over sealed concrete
- Total wall: ${wallWidthFeet(project)} ft x ${heightFeet(project)} ft

Setting: Premium architectural environment. Museum or luxury hospitality.

Style: Architectural presentation board quality. Clean, minimal, premium.

${creativeDirection}

Footer: RB Studio | ${project.code} | CONCEPT`;

    case "DETAIL_SHEET":
      return `Generate a single-page production detail sheet image for a kinetic rotating GFRC slat wall installation. Use a professional engineering document layout with a light gray border, grid reference marks, and clean technical typography.

Header: "${project.code} SLAT WALL DETAIL SHEET" on the left, date on the right.

Layout sections:
[System Overview] — Project: ${project.code}, ${project.name}. ${c.totalSlatCount} rotating GFRC slats. Material: thin GFRC with UV-printed artwork over sealed concrete. Include a 3D isometric view of the complete slat wall showing support frame, pivots, and slat array.

[Wall Dimensions] — Total wall: ${fmt(wallWidthInches(project))}" W x ${fmt(c.slatHeight)}" H (${wallWidthFeet(project)} ft x ${heightFeet(project)} ft). Individual slat: ${fmt(c.slatWidth)}" W x ${fmt(c.slatHeight)}" H x ${fmt(c.slatThickness)}" T. Spacing: ${fmt(c.slatSpacing)}". Show dimensioned front elevation and section detail.

[Slat Construction] — Cross-section detail: GFRC substrate, sealed face, UV-printed artwork, protective clear coat. Edge detail showing thickness and pivot connection.

[Position Logic] — Diagram showing Position A (${fmt(c.rotationAngleA)}°) = "${project.positionAName}" and Position B (${fmt(c.rotationAngleB)}°) = "${project.positionBName}". Show rotation arrows and stop angles.

[Image Mapping] — Show 4-6 slats with Face A / Face B artwork slice assignment (A-01/B-01 through A-06/B-06). Demonstrate how vertical slices compose the full image.

[Finish System] — GFRC substrate → surface prep → sealer → UV print → matte/satin clear coat.

[QC Requirements] — Slat flatness, print fidelity, color consistency, pivot alignment, image registration across adjacent slats.

Footer: The RB Studio logo mark (vertically stacked R over B inside a thin rectangular border, "STUDIO" in spaced uppercase below) on the left, project ref "${project.code}-REV A", "CONFIDENTIAL - INTERNAL USE ONLY" on the right.

${creativeDirection}`;

    case "BUILD_PACKET":
      return buildSlatWallBuildPacketText(project, creativeDirection);
  }
}

export function buildSlatWallDrawingPrompts(project: SlatWallProjectData): SlatWallDrawingPrompt[] {
  return [
    buildSystemArchitectureDrawing(project),
    buildPivotAssemblyDrawing(project),
  ];
}

function buildPivotAssemblyDrawing(project: SlatWallProjectData): SlatWallDrawingPrompt {
  const c = project.config;

  return {
    drawingType: "pivot_assembly",
    promptText: `Create a clean architectural engineering board showing the rotating slat assembly with localized reinforced end zones for a GFRC kinetic slat wall system.

Project: ${project.code} — ${project.name}
Slat: ${fmt(c.slatWidth)}" W x ${fmt(c.slatHeight)}" H x ${fmt(c.slatThickness)}" T thin GFRC concrete

Board title: "ARCHITECTURAL ENGINEERING BOARD: ROTATING SLAT ASSEMBLY WITH LOCALIZED REINFORCED END ZONES"

Board must include these views with clear professional labels:

1. ASSEMBLY ELEVATION (left side):
   Full-height single slat showing:
   - Rotation axis (vertical centerline)
   - Slat body (thin GFRC concrete, ${fmt(c.slatThickness)}" thick)
   - Unreinforced middle span (thin spine, full ${fmt(c.slatHeight)}" height)
   - Reinforced top connection zone (thickened end with cast-in steel insert block)
   - Reinforced bottom connection zone (thickened end with cast-in steel insert block)

2. TOP PIVOT DETAIL (upper center):
   Exploded/cutaway view showing:
   - Low-voltage geared motor
   - Reduction drive
   - Shaft coupling
   - Top pivot shaft
   - Top drive U-bracket connecting to slat
   - Fasteners into reinforced insert block

3. TOP CONNECTION ZONE DETAIL (upper right):
   Cross-section cutaway showing:
   - Cast-in reinforced steel insert block embedded in GFRC
   - Concrete cover around insert
   - Embed depth
   - Fastener path from U-bracket through concrete into steel insert
   - Section hatching on concrete

4. BOTTOM PIVOT DETAIL (lower center):
   View showing:
   - Bottom pivot shaft
   - Passive bearing housing (no motor — free rotation)
   - Bottom support frame connection

5. BOTTOM CONNECTION ZONE DETAIL (lower right):
   Cross-section cutaway showing:
   - Cast-in reinforced steel insert block embedded in GFRC
   - Concrete cover
   - Embed depth
   - Fastener path into reinforced insert block
   - Section hatching on concrete

Style:
- Light neutral or white background
- Premium architectural engineering graphic style
- Clean professional labels with leader lines — no gibberish text
- Realistic proportions and construction detail
- Mix of 3D cutaway and 2D section views
- Less cinematic rendering, more system clarity and engineering precision

Title block: Include the RB Studio logo mark (vertically stacked R over B inside a thin rectangular border) with "${project.code} | PIVOT ASSEMBLY DETAIL" and "STUDIO" in spaced uppercase below the mark.`,
  };
}

function buildSystemArchitectureDrawing(project: SlatWallProjectData): SlatWallDrawingPrompt {
  const c = project.config;
  const ww = wallWidthInches(project);

  return {
    drawingType: "system_architecture",
    promptText: `Create a clean architectural technical board for a rotating vertical slat wall system using thin GFRC finish faces over a structural steel spine.

Project: ${project.code} — ${project.name}
Slat Count: ${c.totalSlatCount}
Slat Dimensions: ${fmt(c.slatWidth)}" W x ${fmt(c.slatHeight)}" H x ${fmt(c.slatThickness)}" T
Wall Width: ${fmt(ww)}" (${(ww / 12).toFixed(1)} ft)
Position A: "${project.positionAName}" | Position B: "${project.positionBName}"

Board layout must include:
1. Front elevation with slat numbering S-01 to S-${String(c.totalSlatCount).padStart(2, "0")}, showing wall width ${(ww / 12).toFixed(1)} ft x height ${heightFeet(project)} ft
2. Position A image logic diagram labeled "Face A — ${project.positionAName}" showing all slats at ${fmt(c.rotationAngleA)}°
3. Position B image logic diagram labeled "Face B — ${project.positionBName}" showing all slats at ${fmt(c.rotationAngleB)}°
4. Single slat exploded section showing:
   - thin GFRC finish face (${fmt(c.slatThickness)}" thick)
   - sealed concrete print surface
   - UV-printed artwork layer
   - matte protective topcoat
   - central structural steel spine
5. Top pivot detail showing concealed pivot pin in ${c.supportFrameType || "aluminum top track"}
6. Bottom pivot detail showing lower bearing support
7. Frame and motor enclosure concept showing concealed top frame housing motors, transmission, and controls
8. Simple dimensional callouts: ${fmt(c.slatWidth)}" width, ${fmt(c.slatHeight)}" (${heightFeet(project)} ft) height, ${fmt(c.slatThickness)}" thickness, ${fmt(c.slatSpacing)}" spacing

Style:
- white or light neutral background
- premium, minimal, highly legible
- real architectural graphic design
- no gibberish text — use only clean professional labels
- less cinematic rendering, more system clarity
- include title block with the RB Studio logo mark (vertically stacked R over B inside a thin rectangular border, "STUDIO" in spaced uppercase below) and "${project.code} | SYSTEM ARCHITECTURE"`,
  };
}

function buildSlatWallBuildPacketText(
  project: SlatWallProjectData,
  creativeDirection: string,
): string {
  const c = project.config;
  const ww = wallWidthInches(project);

  const estWeight = (c.slatWidth * c.slatHeight * c.slatThickness * 0.08).toFixed(1);
  const lastSlat = `S-${String(c.totalSlatCount).padStart(2, "0")}`;

  const sections = [
    `1. PROJECT OVERVIEW
Project: ${project.code} — ${project.name}
Client: ${project.clientName || "RB Studio"}
Location: ${project.location || "TBD"}
Designer: ${project.designer || "RB Studio"}
Revision: ${project.config.rotationAngleA}
Design Intent: Premium kinetic rotating vertical slat wall installation. ${c.totalSlatCount} thin GFRC concrete slats with UV-printed artwork revealing two complete composite images.
Production Assumption: GFRC slat substrate + sealed print face + UV print artwork + matte/satin protective clear coat
Position A ("${project.positionAName}"): ${project.positionADescription || "Full-wall composite image"}
Position B ("${project.positionBName}"): ${project.positionBDescription || "Full-wall composite image"}`,

    `2. SYSTEM SUMMARY
Slat Count: ${c.totalSlatCount}
Wall Dimensions: ${fmt(ww)}" W x ${fmt(c.slatHeight)}" H (${(ww / 12).toFixed(1)} ft x ${heightFeet(project)} ft)
Individual Slat: ${fmt(c.slatWidth)}" W x ${fmt(c.slatHeight)}" H x ${fmt(c.slatThickness)}" T
Estimated Weight Per Slat: ${estWeight} lbs
Slat Material: Thin GFRC (Glass Fiber Reinforced Concrete)
Finish System: Sealed concrete substrate → UV print → protective clear coat
Support Frame: ${c.supportFrameType || "Engineered aluminum top/bottom track"}
Pivot System: ${c.pivotType || "Concealed vertical pin pivot"}
Rotation: Position A = ${fmt(c.rotationAngleA)}°, Position B = ${fmt(c.rotationAngleB)}°
Slat Spacing: ${fmt(c.slatSpacing)}"`,

    `3. SUBSTRATE SPEC — GFRC SLAT CONSTRUCTION

3.1 DESIGN INTENT
Each slat shall be designed as a dimensionally stable architectural display element, not as a plain thin concrete member. The slat body shall include localized reinforced top and bottom connection zones with cast-in reinforced steel insert blocks, together with a lightweight internal body construction and concealed mid-span anti-warp reinforcement sufficient to resist bowing, twisting, and long-term display distortion.

The middle span shall NOT use a full-length central structural steel spine. However, the slat may incorporate concealed non-primary stiffening elements — such as composite stiffener strips, internal ribs, lightweight core geometry, or similar stabilization methods — to maintain straightness and image alignment under normal environmental exposure.

3.2 MATERIAL
Material: Glass Fiber Reinforced Concrete (GFRC)
Reinforcement: AR (alkali-resistant) glass fiber at 2.5-3% by weight
Mix Type: SCC (self-consolidating concrete) for thin-section casting
Casting: Precision mold pour with controlled fiber distribution

3.3 DIMENSIONS
Width: ${fmt(c.slatWidth)}" nominal
Height: ${fmt(c.slatHeight)}" (${heightFeet(project)} ft)
Thickness: ${fmt(c.slatThickness)}" nominal body thickness
Weight: approximately ${estWeight} lbs per slat (estimated)

3.4 CONNECTION ZONES (TOP AND BOTTOM)
Each slat shall have localized reinforced zones at the top and bottom ends:
- Cast-in reinforced steel insert block embedded in GFRC
- Insert block provides threaded/mechanical connection point for pivot hardware
- Concrete cover: minimum 3/16" around insert block
- Embed depth: minimum 2x fastener diameter
- Zone length: approximately 6-8" from each end
- Zone may be locally thickened beyond ${fmt(c.slatThickness)}" body to accommodate insert block and fastener loads
- Insert block material: mild steel, hot-dip galvanized or stainless

3.5 MIDDLE SPAN BODY
- Lightweight GFRC construction at ${fmt(c.slatThickness)}" nominal thickness
- No full-length central steel spine
- Concealed anti-warp reinforcement permitted:
  - Composite stiffener strips (carbon fiber, fiberglass, or similar)
  - Internal ribs cast into back face
  - Lightweight core geometry (foam core sandwich if needed for flatness)
  - Pre-tension or post-tension elements if engineering requires
- Goal: maintain straightness within 1/16" over full ${fmt(c.slatHeight)}" height under normal interior environmental conditions
- Both visible faces must remain flat, smooth, and print-ready

3.6 TOLERANCES
Flatness: Within 1/16" over full ${fmt(c.slatHeight)}" height
Width: +/- 1/32"
Thickness: +/- 1/32" in body zone
Edge Condition: Eased edges, all corners minimum 1/16" radius

3.7 CURE AND HANDLING
Cure: Minimum 7-day wet cure before surface prep
Handling: Edge guards required during transport — GFRC chips easily at thin sections
Storage: Store flat on padded rails, never stack unsupported

3.8 PRINTABLE FACES
Each slat has TWO printable faces — Face A and Face B
Both faces must meet identical flatness, smoothness, and sealer-readiness standards`,

    `4. SURFACE PREP SPEC
Purpose: Prepare cured GFRC faces for sealer and UV print adhesion
Process:
  1. Dry slat fully after cure (minimum 48 hours air dry after wet cure)
  2. Sand both printable faces with 120-grit to remove form release residue
  3. Follow with 220-grit to create uniform micro-texture for sealer adhesion
  4. Vacuum all dust from faces and edges — zero residue
  5. Wipe with lint-free cloth dampened with denatured alcohol
  6. Inspect under raking light — reject any face with voids >1mm, cracks, or exposed fiber
  7. Mark rejected faces for patching before proceeding
Tolerance: Surface flatness within 1/32" across print zone
Critical: Both Face A and Face B must be prepped to identical standard`,

    `5. SEALER SPEC
Purpose: Create a compatible, consistent print-base surface for UV ink adhesion
Product: Penetrating concrete sealer compatible with UV direct print
  - Must not create a glossy film — matte penetrating absorption preferred
  - Must seal porosity without blocking ink adhesion
  - Must not yellow or discolor under UV exposure
Application:
  1. Apply sealer to Face A — single even coat with foam roller or HVLP spray
  2. Allow 4-hour dry time at 70°F minimum
  3. Light scuff with 320-grit if any raised grain or dust nibs
  4. Apply sealer to Face B — same process
  5. Final inspection: sealed surface should feel smooth, non-porous, uniformly matte
Coverage: Approximately 200 sq ft per gallon
Rejection Criteria: Uneven sealer absorption, glossy spots, visible roller marks, dust contamination`,

    `6. PRINT SPEC — UV DIRECT PRINT OVER SEALED CONCRETE
Method: UV flatbed direct print on sealed GFRC substrate
Equipment: Industrial UV flatbed printer capable of ${fmt(c.slatWidth)}" x ${fmt(c.slatHeight)}" print area
Resolution: Minimum 150 DPI at final print size (300 DPI preferred)
Color Management: ICC profile calibrated to sealed GFRC substrate
  - Profile must account for concrete surface absorption
  - Test strip printed on sample slat before production run
  - Match between adjacent slats is critical — use same profile and batch
Ink: UV-curable inks rated for architectural interior durability
Print Origin: Bottom-left corner of each face, consistent across all slats
Registration: Print origin aligned to physical slat edge — maximum 1/32" drift
Bleed: ${fmt(c.slatSpacing / 2)}" bleed beyond visible face area on left and right edges
Safe Zone: Keep critical image content 1/4" from all edges
Edge Masking: Mask ${fmt(c.slatSpacing / 2)}" from each vertical edge before printing if required
Print Both Faces: Each slat receives two print passes — Face A then Face B
Handling: Edge guards during print positioning — fresh GFRC chips easily`,

    `7. PRINT FILE NAMING AND DELIVERY
Naming Convention:
  Face A files: ${project.code}_A-01.tiff through ${project.code}_A-${String(c.totalSlatCount).padStart(2, "0")}.tiff
  Face B files: ${project.code}_B-01.tiff through ${project.code}_B-${String(c.totalSlatCount).padStart(2, "0")}.tiff

File Format: TIFF, 300 DPI, CMYK, no compression
  - Alternate: PDF/X-4 with embedded ICC profile
Dimensions Per File: ${fmt(c.slatWidth)}" W x ${fmt(c.slatHeight)}" H plus ${fmt(c.slatSpacing / 2)}" bleed on left/right
Total Files: ${c.totalSlatCount * 2} (${c.totalSlatCount} Face A + ${c.totalSlatCount} Face B)
Color Space: CMYK with ICC profile matched to sealed concrete substrate
Delivery: All files in a single project folder named "${project.code}_PRINT_FILES"
Verification: Print proof strip on sample sealed GFRC before full production run`,

    `8. TOPCOAT SPEC — PROTECTIVE CLEAR COAT
Purpose: Protect UV-printed artwork from abrasion, UV fade, and moisture
Product: Water-based polyurethane clear coat, matte or satin sheen
  - Must be compatible with UV-cured ink layer
  - Must not yellow, crack, or peel
  - Must not alter color fidelity of underlying print
Application:
  1. Allow UV ink to fully cure — minimum 24 hours after printing
  2. Apply first coat to Face A with HVLP spray — thin, even, no runs
  3. Dry 4 hours minimum
  4. Light scuff with 400-grit if needed for adhesion between coats
  5. Apply second coat to Face A
  6. Repeat for Face B (two coats)
  7. Final dry 24 hours before handling
Total Coats: 2 per face (4 total per slat)
Sheen: Matte (recommended) or Satin — must be consistent across all slats
Rejection Criteria: Runs, drips, dust contamination, uneven sheen, visible brush marks, color shift from underlying print`,

    `9. SLAT MAPPING AND ARTWORK ASSIGNMENT
Image A ("${project.positionAName}") → sliced into ${c.totalSlatCount} vertical strips → assigned to Face A of each slat
Image B ("${project.positionBName}") → sliced into ${c.totalSlatCount} vertical strips → assigned to Face B of each slat

Mapping Rule: Slat at wall position N receives:
  - Face A: image slice A-N (from Image A)
  - Face B: image slice B-N (from Image B)

Slat Schedule:
Slat ID | Wall Pos | Face A Slice | Face B Slice | Width | Height | Thickness | Orientation
${Array.from({ length: Math.min(c.totalSlatCount, 36) }, (_, i) => {
  const n = i + 1;
  const id = `S-${String(n).padStart(2, "0")}`;
  const fA = `A-${String(n).padStart(2, "0")}`;
  const fB = `B-${String(n).padStart(2, "0")}`;
  const note = n === 1 ? "Left start" : n === c.totalSlatCount ? "Right end" : "";
  return `${id}      | ${String(n).padStart(3)}      | ${fA}          | ${fB}          | ${fmt(c.slatWidth)}"    | ${fmt(c.slatHeight)}"   | ${fmt(c.slatThickness)}"      | Standard${note ? ` | ${note}` : ""}`;
}).join("\n")}

Face A is visible only in Position A. Face B is visible only in Position B.
Image continuity depends on correct slat ordering — left to right, S-01 through ${lastSlat}.`,

    `10. POSITION LOGIC
Position A: All slats rotated to ${fmt(c.rotationAngleA)}° — Face A visible — displays "${project.positionAName}"
Position B: All slats rotated to ${fmt(c.rotationAngleB)}° — Face B visible — displays "${project.positionBName}"
Rotation Direction: All slats rotate same direction (clockwise from top view)
Leading Edge: Right edge when viewed from front
Orientation Arrow: Marked on top edge of each slat pointing toward Face A
Stop Mechanism: Precision rotation stops at ${fmt(c.rotationAngleA)}° and ${fmt(c.rotationAngleB)}°
Installation Alignment: S-01 at left end of wall, ${lastSlat} at right end`,

    `11. ELECTRICAL + CONTROLS SYSTEM

CONTROL INTENT:
The SW-01 Rotating Slat Wall System shall operate as a three-state kinetic installation:
- State A: All slats at ${fmt(c.rotationAngleA)}deg - Face A visible - "${project.positionAName}"
- State B: All slats at ${fmt(c.rotationAngleB)}deg - Face B visible - "${project.positionBName}"
- State C (Emergent): Odd slats show Face A, Even slats show Face B - hidden third image revealed
The system cycles A > B > C > A automatically on configurable dwell timers.

SYSTEM ARCHITECTURE - TWO MOTOR GROUP DESIGN:
The drive system uses TWO independent motors, each driving its own group of slats via separate timing belts:

- MOTOR-ODD: Drives odd-numbered slats (S-01, S-03, S-05, S-07...) via dedicated timing belt
  Total slats on Motor-Odd: ${Math.ceil(c.totalSlatCount / 2)}
- MOTOR-EVEN: Drives even-numbered slats (S-02, S-04, S-06, S-08...) via dedicated timing belt
  Total slats on Motor-Even: ${Math.floor(c.totalSlatCount / 2)}

Each slat pivot shaft has a GT2 timing pulley keyed to ONLY its group's belt. The other belt passes freely via idler bearings. No mechanical coupling between groups. No clutches required.

DRIVE MECHANISM (TOP RAIL CROSS SECTION):
Two parallel timing belts run along the top mounting rail:
- Belt 1 (Motor-Odd): engages pulleys on S-01, S-03, S-05... / idles past S-02, S-04, S-06...
- Belt 2 (Motor-Even): engages pulleys on S-02, S-04, S-06... / idles past S-01, S-03, S-05...
Each motor mounts at one end of the top rail inside the concealed enclosure.

THREE-STATE ROTATION SEQUENCE:

  STATE A (home position):
    Motor-Odd  = 0deg   > Odd slats show Face A
    Motor-Even = 0deg   > Even slats show Face A
    Result: Full "${project.positionAName}" image visible
    [Dwell timer: configurable, default 45 seconds]

  TRANSITION A > B (both motors rotate simultaneously):
    Motor-Odd  rotates to 180deg
    Motor-Even rotates to 180deg

  STATE B:
    Motor-Odd  = 180deg > Odd slats show Face B
    Motor-Even = 180deg > Even slats show Face B
    Result: Full "${project.positionBName}" image visible
    [Dwell timer: configurable, default 45 seconds]

  TRANSITION B > C (only Motor-Odd moves):
    Motor-Odd  rotates back to 0deg
    Motor-Even stays at 180deg (no movement)

  STATE C (emergent):
    Motor-Odd  = 0deg   > Odd slats show Face A
    Motor-Even = 180deg > Even slats show Face B
    Result: Alternating A/B strips reveal emergent hidden image
    [Dwell timer: configurable, default 45 seconds]

  TRANSITION C > A (only Motor-Even moves):
    Motor-Odd  stays at 0deg (no movement)
    Motor-Even rotates back to 0deg

  > Back to State A - cycle repeats

KEY ADVANTAGE: Each transition requires only ONE motor to move (except A>B which moves both simultaneously). No mechanical conflicts. No clutches. Simple and reliable.

POWER ARCHITECTURE:
- System voltage: 24V DC for motion and controls
- Facility provides dedicated 20A building power circuit to controls enclosure
- Building power converted locally to regulated 24V DC via switching power supply
- Internal distribution: 24V DC motor power, 24V DC control power, sensor power

MOTOR SPECIFICATIONS:
- Motor type: NEMA 23 stepper motors (2 required)
- Motor drivers: TB6600 or equivalent stepper drivers (2 required)
- Steps per 180deg rotation: 400 (depends on microstepping and gear ratio)
- Rotation speed: Adjustable 5-60 seconds per 180deg rotation
- Controlled acceleration/deceleration ramp profiles

POSITION SENSING AND CONFIRMATION:
- Primary feedback: stepper motor step counting (open loop) with home calibration
- Secondary confirmation: inductive proximity sensor or hall-effect sensor (1 per motor group)
- Home sensors mounted on one reference slat per group for startup calibration
- Required states confirmed: State A reached, State B reached, State C reached, no jam/stall

CONTROLLER:
- Arduino Mega or ESP32 microcontroller
- Firmware: state machine cycling through A > B > C > A
- Configurable parameters via serial/USB or DIP switches:
  - Dwell time per state (default 45 seconds)
  - Rotation speed (default 10 seconds per 180deg)
  - Acceleration ramp profile
  - Scheduled operating hours (optional)
- Status LED indicators: Power, State A, State B, State C, Fault

SAFETY AND FAULT HANDLING:
- Emergency stop button at controls enclosure
- Fault conditions: motor stall, over-current, home sensor failure, power interruption
- Fault response: stop all motion, hold current state, illuminate fault LED
- Maintenance mode: disable automatic cycle, manual jog via push buttons
- Power loss recovery: on power restore, run home calibration before resuming cycle

TOP FRAME MOTOR ENCLOSURE:
- Concealed housing in top mounting rail for: 2 motors, 2 drivers, controller, power supply, belt tensioners
- Removable access panels for motor replacement, belt tensioning, controller access
- Ventilation slots for motor/driver heat dissipation

BOTTOM FRAME SUPPORT:
- Lower passive bearing housings for each slat pivot
- Alignment rail for consistent slat spacing
- No active components at bottom - passive bearing only

CABLING:
- Motor power cables (2): from drivers to motors in top enclosure
- Sensor cables (2): from home sensors to controller
- Power input cable: from building circuit to 24V power supply
- All wiring concealed in top rail enclosure
- Service loops at motor connections for maintenance access

HARDWARE BILL OF MATERIALS:
  NEMA 23 stepper motors: 2
  TB6600 stepper drivers: 2
  GT2 timing belt: 2 runs (length = wall width + tensioner slack)
  GT2 timing pulleys (20T): ${c.totalSlatCount} (one per slat pivot) + 2 (motor shafts) + 2 (idler tensioners)
  Inductive proximity sensors: 2 (home position per group)
  Arduino Mega or ESP32: 1
  24V 10A switching power supply: 1
  DIN rail mount enclosure: 1
  Emergency stop button: 1
  Status LED panel: 1
  Wiring harness and connectors: 1 set

COMMISSIONING CHECKLIST:
1. Verify Motor-Odd drives only odd slats (no even slat movement)
2. Verify Motor-Even drives only even slats (no odd slat movement)
3. Run home calibration on both motors - confirm sensor triggers
4. Test State A position - all slats at 0deg - full Side A image visible
5. Test State B position - all slats at 180deg - full Side B image visible
6. Test State C position - odd at 0deg, even at 180deg - emergent image visible
7. Run full automatic cycle: A > B > C > A at least 3 complete loops
8. Verify dwell timers are accurate
9. Test emergency stop - confirm immediate halt
10. Test power loss recovery - confirm home recalibration on restart
11. Verify rotation speed and acceleration profiles are smooth
12. Check belt tension on both belts
13. Confirm all status LEDs function correctly
14. Document final dwell times and speed settings

ENGINEERING NOTE:
This is a production-ready basis of design for the two-motor-group drive architecture. Final motor torque calculations, belt tension specifications, and enclosure thermal management shall be verified during prototype development.`,

    `12. SLAT ROTATION SCHEDULE - INSTALLATION REFERENCE
This table shows every slat's motor group assignment and rotation angle for each of the three display states.
The installation crew must verify each slat is connected to the CORRECT motor group belt before commissioning.

Slat ID | Motor Group | Belt   | State A (0deg) | State B (180deg) | State C (Emergent)
${Array.from({ length: c.totalSlatCount }, (_, i) => {
  const n = i + 1;
  const id = `S-${String(n).padStart(2, "0")}`;
  const group = n % 2 === 1 ? "ODD " : "EVEN";
  const belt = n % 2 === 1 ? "Belt 1" : "Belt 2";
  const stateA = "0deg  (Face A)  ";
  const stateB = "180deg (Face B) ";
  const stateC = n % 2 === 1 ? "0deg  (Face A)  " : "180deg (Face B) ";
  return `${id}     | ${group}        | ${belt} | ${stateA} | ${stateB}  | ${stateC}`;
}).join("\n")}

MOTOR GROUP SUMMARY:
  Motor-Odd (Belt 1): Drives ${Math.ceil(c.totalSlatCount / 2)} slats (${Array.from({ length: Math.ceil(c.totalSlatCount / 2) }, (_, i) => `S-${String(i * 2 + 1).padStart(2, "0")}`).join(", ")})
  Motor-Even (Belt 2): Drives ${Math.floor(c.totalSlatCount / 2)} slats (${Array.from({ length: Math.floor(c.totalSlatCount / 2) }, (_, i) => `S-${String(i * 2 + 2).padStart(2, "0")}`).join(", ")})

BELT CONNECTION VERIFICATION:
Before commissioning, manually rotate each motor independently and verify:
1. Run Motor-Odd only: ONLY odd-numbered slats should move. If any even slat moves, the belt/pulley connection is wrong.
2. Run Motor-Even only: ONLY even-numbered slats should move. If any odd slat moves, the belt/pulley connection is wrong.
3. If a slat moves with the wrong motor, check: pulley keyed to wrong belt, idler bearing seized, or belt routing error.`,

    `13. INSTALL SEQUENCE
1. Install top frame track — verify level, plumb, and structural anchor
2. Install bottom frame track — verify alignment to top track
3. Install pivot hardware at each of ${c.totalSlatCount} positions — verify spacing at ${fmt(c.slatWidth + c.slatSpacing)}" on center
4. Verify slat numbering matches wall position (S-01 = leftmost)
5. Hang slats left to right in sequence: S-01 → ${lastSlat}
6. Per slat:
   a. Verify orientation arrow points toward Face A
   b. Engage top pivot
   c. Engage bottom pivot
   d. Confirm free rotation between Position A and Position B
   e. Confirm stop positions lock at ${fmt(c.rotationAngleA)}° and ${fmt(c.rotationAngleB)}°
7. Connect Belt 1 (Motor-Odd) to odd slat pulleys: S-01, S-03, S-05...
8. Connect Belt 2 (Motor-Even) to even slat pulleys: S-02, S-04, S-06...
9. Verify belt connections per Section 12 rotation schedule
10. Run Motor-Odd only - confirm ONLY odd slats move
11. Run Motor-Even only - confirm ONLY even slats move
12. Set all slats to State A (both motors 0deg) - verify full "${project.positionAName}" image
13. Set all slats to State B (both motors 180deg) - verify full "${project.positionBName}" image
14. Set State C (Motor-Odd 0deg, Motor-Even 180deg) - verify emergent image
15. Run full automatic cycle: A > B > C > A at least 3 complete loops
16. Check slat spacing consistency - adjust any drifted pivots
17. Final QC signoff on all three states`,

    `14. QC CHECKLIST
SUBSTRATE QC:
  - [ ] Slat width: ${fmt(c.slatWidth)}" +/- 1/32"
  - [ ] Slat height: ${fmt(c.slatHeight)}" +/- 1/16"
  - [ ] Slat thickness: ${fmt(c.slatThickness)}" +/- 1/32"
  - [ ] Flatness: within 1/16" over full height
  - [ ] Edge condition: eased, no chips, no exposed fiber
  - [ ] Both faces free of voids, cracks, and surface defects

SURFACE PREP QC:
  - [ ] Both faces sanded to uniform micro-texture
  - [ ] No dust residue, release agent, or contamination
  - [ ] Inspected under raking light — no defects

SEALER QC:
  - [ ] Even absorption — no glossy spots or dry patches
  - [ ] No roller marks, drips, or dust contamination
  - [ ] Matte uniform finish on both faces

PRINT QC:
  - [ ] Correct slice on correct slat (A-N on Face A, B-N on Face B)
  - [ ] No Face A / Face B swap
  - [ ] No reversed orientation
  - [ ] Print registration within 1/32" of slat edge
  - [ ] No image drift, banding, or streaking
  - [ ] Tonal continuity verified against adjacent slats
  - [ ] Color matches proof strip

TOPCOAT QC:
  - [ ] Two coats applied per face
  - [ ] No runs, drips, or dust contamination
  - [ ] Sheen consistent across all slats (matte or satin)
  - [ ] No color shift from underlying print
  - [ ] 24-hour cure complete before handling

ASSEMBLY QC:
  - [ ] Pivot engagement — smooth rotation, no binding
  - [ ] Stop angle accuracy — locks at ${fmt(c.rotationAngleA)}° and ${fmt(c.rotationAngleB)}°
  - [ ] Slat spacing: ${fmt(c.slatSpacing)}" +/- 1/32" between all adjacent slats
  - [ ] Frame level and plumb

INSTALLED READ TEST:
  - [ ] Position A: "${project.positionAName}" reads as one continuous image across full wall
  - [ ] Position B: "${project.positionBName}" reads as one continuous image across full wall
  - [ ] No visible misalignment between adjacent slat images
  - [ ] Transition state reads as elegant abstract fragmentation`,

    `15. FAILURE POINTS (READ THIS)
Most common production failures:
- Incorrect slat order — destroys image continuity (MOST CRITICAL)
- Slat installed backward (Face A/B swap) — wrong image on wrong position
- Poor print registration — visible misalignment between adjacent slats
- Inconsistent sealer application — uneven ink absorption = color banding
- Topcoat applied too thick — runs and drips on vertical face
- Low contrast between image slices — image reads as fragmented not unified
- Edge drift from print boundaries — visible banding at slat gaps
- Warped slat — won't align flush with neighbors
- Pivot misalignment — uneven rotation, gap inconsistency
- Stop-angle inaccuracy — image doesn't align at designed position
- Print file naming error — wrong artwork on wrong slat`,
  ];

  return sections.join("\n\n") + (creativeDirection ? `\n\n${creativeDirection}` : "");
}

// ─── SIMULATOR PROMPT SYSTEM ──────────────────────────────────
// Master system prompt + per-state builders for the three-state
// rotating slat wall AI image generation (Gemini).

export type SlatWallSimulatorPromptConfig = {
  slatCount: number;
  slatWidthInches: number;
  wallWidthFeet: string;
  wallHeightFeet: string;
  backgroundTone: string;
  sideASubject: string;
  sideBSubject: string;
  emergentSubject: string;
  sideAInterpretationGuidance: string;
  sideBInterpretationGuidance: string;
  emergentInterpretationGuidance: string;
  projectCode: string;
};

export type SlatWallImageCombo = {
  id: string;
  label: string;
  emergent: string;
  sideA: string;
  sideB: string;
  description: string;
  sideAGuidance: string;
  sideBGuidance: string;
  emergentGuidance: string;
};

// ─── 9 CURATED IMAGE COMBINATIONS ────────────────────────────

export const SLAT_WALL_IMAGE_COMBOS: SlatWallImageCombo[] = [
  {
    id: "bear",
    label: "City Skyline + Storm Clouds → Bear",
    emergent: "Bear",
    sideA: "City Skyline",
    sideB: "Storm Clouds",
    description:
      "Best overall. Strong silhouette, easy to recognize, good large massing.",
    sideAGuidance:
      "Interpret the city skyline as bold tower silhouette massing with strong height variation and broad value zones. Avoid windows, facade detail, tiny buildings, or small texture. Favor simplified city-form blocks that remain legible across the slat wall.",
    sideBGuidance:
      "Interpret the storm clouds as broad dark cloud masses and simplified storm-front forms. Avoid soft photographic vapor detail and subtle atmospheric texture. Favor large high-contrast cloud groupings that remain legible across the slat wall.",
    emergentGuidance:
      "Interpret the bear as a bold recognizable silhouette or large head-and-shoulders mass. Avoid fur detail and internal texture. Favor strong body mass, head shape, shoulder shape, and large black/cream grouping so the bear remains legible through alternating slat interleaving.",
  },
  {
    id: "wolf",
    label: "Mountain Peak + Solar Eclipse → Wolf",
    emergent: "Wolf",
    sideA: "Mountain Peak",
    sideB: "Solar Eclipse",
    description:
      "Very strong, elegant, angular emergent image.",
    sideAGuidance:
      "Interpret the mountain peak as bold ridgeline masses with strong angular silhouettes. Avoid fine rock texture, snow detail, or tiny terrain features. Favor simplified peak shapes and broad dark/light mountain forms that remain legible across the slat wall.",
    sideBGuidance:
      "Interpret the solar eclipse as a dark circular aura with radiating band masses. Avoid fine corona detail or subtle light gradients. Favor bold dark disc shape with strong concentric or radiating dark/light bands that remain legible across the slat wall.",
    emergentGuidance:
      "Interpret the wolf as a bold head profile or three-quarter head silhouette. Avoid fur detail, whiskers, or fine facial features. Favor strong muzzle shape, ear silhouette, neck mass, and large black/cream grouping so the wolf remains legible through alternating slat interleaving.",
  },
  {
    id: "eagle",
    label: "Desert Dunes + Crescent Moon → Eagle",
    emergent: "Eagle",
    sideA: "Desert Dunes",
    sideB: "Crescent Moon",
    description:
      "Very readable if the emergent image is simplified.",
    sideAGuidance:
      "Interpret the desert dunes as layered sand ridge masses with flowing horizontal curvature. Avoid fine sand grain texture or tiny ripple detail. Favor bold sweeping dune forms and broad dark/light banding that remain legible across the slat wall.",
    sideBGuidance:
      "Interpret the crescent moon as bold celestial arc forms with strong dark/light contrast. Avoid fine star detail or subtle atmospheric glow. Favor large arc shapes and broad tonal masses that remain legible across the slat wall.",
    emergentGuidance:
      "Interpret the eagle as a bold silhouette — either head/beak profile or full side silhouette with broad wings. Avoid feather detail and fine plumage texture. Favor strong head/beak shape, broad wing mass, and large black/cream grouping so the eagle remains legible through alternating slat interleaving.",
  },
  {
    id: "skull",
    label: "Ocean Waves + Solar Disc → Skull",
    emergent: "Skull",
    sideA: "Ocean Waves",
    sideB: "Solar Disc",
    description:
      "Graphic, high-contrast, easy to read, slightly darker mood.",
    sideAGuidance:
      "Interpret the ocean waves as bold horizontal wave band masses with strong rhythmic curvature. Avoid fine foam detail, spray texture, or subtle water patterns. Favor large simplified wave forms and broad dark/light banding that remain legible across the slat wall.",
    sideBGuidance:
      "Interpret the solar disc as a bold radiating circular mass with strong concentric band structure. Avoid fine ray detail or subtle light gradients. Favor large disc shape with bold dark/light radial grouping that remains legible across the slat wall.",
    emergentGuidance:
      "Interpret the skull as a bold iconic silhouette with simplified eye sockets, cranium mass, and jaw shape. Avoid tiny cracks, teeth detail, or over-detailed bone texture. Favor strong cranium dome, dark eye socket masses, and large black/cream grouping so the skull remains legible through alternating slat interleaving.",
  },
  {
    id: "human-face",
    label: "Storm Sky + Rising Sun → Human Face",
    emergent: "Human Face",
    sideA: "Storm Sky",
    sideB: "Rising Sun",
    description:
      "Very premium, artistic. Face reads well if simplified.",
    sideAGuidance:
      "Interpret the storm sky as bold dark cloud masses with strong atmospheric banding. Avoid soft photographic vapor detail or subtle light effects. Favor large simplified storm forms and broad dark/light grouping that remain legible across the slat wall.",
    sideBGuidance:
      "Interpret the rising sun as bold horizon glow bands with strong radial or horizontal light massing. Avoid subtle gradient transitions or fine atmospheric detail. Favor large simplified sun/horizon forms and broad dark/light banding that remain legible across the slat wall.",
    emergentGuidance:
      "Interpret the human face as a bold profile silhouette or calm frontal portrait with simplified planes. Avoid eyelashes, skin texture, photographic realism, or fine facial features. Think sculpture silhouette, not portrait photo. Favor strong forehead, cheekbone, jaw contour, and large black/cream grouping so the face remains legible through alternating slat interleaving.",
  },
  {
    id: "raven",
    label: "Pine Forest + Night Sky → Raven",
    emergent: "Raven",
    sideA: "Pine Forest",
    sideB: "Night Sky",
    description:
      "Excellent for darker, sharper visual language.",
    sideAGuidance:
      "Interpret the pine forest as bold vertical tree silhouette bands with strong dark massing. Avoid fine needle texture, branch detail, or individual tree rendering. Favor simplified forest-edge silhouettes and broad dark/light grouping that remain legible across the slat wall.",
    sideBGuidance:
      "Interpret the night sky as broad dark cloud band masses with simplified atmospheric structure. Avoid fine star detail, subtle gradients, or wispy cloud texture. Favor large dark/light sky groupings that remain legible across the slat wall.",
    emergentGuidance:
      "Interpret the raven as a bold profile or perched silhouette emphasizing beak, head, and body contour. Avoid feather detail, fine plumage, or realistic rendering. Favor strong beak shape, head mass, body contour, and large black/cream grouping so the raven remains legible through alternating slat interleaving.",
  },
  {
    id: "lion",
    label: "Savannah Tree Line + Desert Storm → Lion",
    emergent: "Lion",
    sideA: "Savannah Tree Line",
    sideB: "Desert Storm",
    description:
      "Big heroic read, iconic and bold.",
    sideAGuidance:
      "Interpret the savannah tree line as bold horizon-level tree silhouette bands with strong dark massing. Avoid fine leaf texture, individual branches, or detailed bark. Favor simplified acacia-like tree forms and broad dark/light grouping that remain legible across the slat wall.",
    sideBGuidance:
      "Interpret the desert storm as bold heat-wave and storm cloud masses with strong horizontal banding. Avoid fine sand detail or subtle atmospheric effects. Favor large simplified storm forms and broad dark/light grouping that remain legible across the slat wall.",
    emergentGuidance:
      "Interpret the lion as a bold head silhouette or profile with simplified mane mass. Avoid hair detail, whiskers, or fine facial features. Think emblem, not wildlife photo. Favor strong mane mass, head shape, and large black/cream grouping so the lion remains legible through alternating slat interleaving.",
  },
  {
    id: "whale",
    label: "Ocean Wave Horizon + Moonlit Clouds → Whale",
    emergent: "Whale",
    sideA: "Ocean Wave Horizon",
    sideB: "Moonlit Clouds",
    description:
      "Fluid, calm motion. Very elegant in line-density style.",
    sideAGuidance:
      "Interpret the ocean wave horizon as bold flowing wave band masses with strong horizontal curvature. Avoid fine foam texture, spray detail, or small ripple patterns. Favor large simplified wave forms and broad dark/light banding that remain legible across the slat wall.",
    sideBGuidance:
      "Interpret the moonlit clouds as broad dark cloud masses with simplified tide-band structure and lunar glow. Avoid fine star detail or subtle atmospheric gradients. Favor large simplified cloud/tide forms and broad dark/light grouping that remain legible across the slat wall.",
    emergentGuidance:
      "Interpret the whale as a bold side silhouette — broad back, tail, and head contour only. Avoid water spray detail, eye detail, or fine body texture. Favor strong single-mass body shape and large black/cream grouping so the whale remains legible through alternating slat interleaving.",
  },
  {
    id: "tree",
    label: "Mountain Ridgeline + Rain Bands → Tree",
    emergent: "Tree",
    sideA: "Mountain Ridgeline",
    sideB: "Rain Bands",
    description:
      "Simple, strong, highly manufacturable. Easiest emergent to read.",
    sideAGuidance:
      "Interpret the mountain ridgeline as bold peak silhouette masses with strong angular forms. Avoid fine rock texture, snow detail, or tiny terrain features. Favor simplified ridge shapes and broad dark/light mountain forms that remain legible across the slat wall.",
    sideBGuidance:
      "Interpret the rain bands as bold atmospheric band masses with strong horizontal movement. Avoid fine raindrop detail or subtle mist texture. Favor large simplified storm/rain forms and broad dark/light grouping that remain legible across the slat wall.",
    emergentGuidance:
      "Interpret the tree as a bold solitary tree silhouette with strong trunk and canopy mass. Avoid too many branch details, fine leaf texture, or realistic bark. Favor strong iconic shape — trunk plus canopy — and large black/cream grouping so the tree remains legible through alternating slat interleaving.",
  },
];

// ─── SHARED NEGATIVE RULES ───────────────────────────────────

const SIMULATOR_NEGATIVE_RULES = `NEGATIVE RULES:
- Do not create a standalone poster composition
- Do not ignore the shared slat grid
- Do not add or subtract slat columns — render EXACTLY the specified count
- Do not shift the grid — the first slat must begin exactly at the left edge of the canvas
- Do not change crop, margins, or background tone between states
- Do not use fine photoreal detail
- Do not use tiny textures
- Do not leave any slat blank
- Do not introduce color
- Do not add perspective or environment
- Do not use diagonal hatching, dots, or painterly shading
- Do not let high-density lines bleed together into solid black blobs — all horizontal lines must remain distinct and non-overlapping
- Do not render the emergent image as a transparent overlay — it must read as interleaved vertical strips, not a ghosted third layer
- Do not add cracks, stains, debris, or weathering to the background — use minimalist smooth concrete texture only
- Do not make the emergent image feel unrelated to Side A and Side B`;

// ─── PROMPT BUILDERS ──────────────────────────────────────────

export function buildSimulatorMasterPrompt(config: SlatWallSimulatorPromptConfig): string {
  // Compute pixel-exact grid dimensions for a 2048px wide canvas
  const canvasWidth = 2048;
  const dividerWidth = 2;
  const totalDividers = config.slatCount + 1; // dividers on both edges and between slats
  const usableWidth = canvasWidth - totalDividers * dividerWidth;
  const colWidth = Math.floor(usableWidth / config.slatCount);

  return `MASTER SYSTEM PROMPT

MANDATORY CANVAS STRUCTURE (DO NOT ALTER — DEFINE THIS BEFORE ANY SUBJECT):
The canvas is a ${canvasWidth}-pixel-wide image with a rigid coordinate system.
This coordinate system is SHARED across all three states (A, B, and C) and must not be altered between them.

THE GRID (PIXEL-EXACT):
- Total columns: EXACTLY ${config.slatCount}
- Column width: ${colWidth} pixels each
- Divider: ${dividerWidth}-pixel black vertical line between every column and at both edges
- First divider: x=0 (left edge of canvas)
- Column 1 content area: x=${dividerWidth} to x=${dividerWidth + colWidth}
- Column 2 content area: x=${dividerWidth + colWidth + dividerWidth} to x=${dividerWidth * 2 + colWidth * 2}
- Pattern continues uniformly to column ${config.slatCount}
- ALL content must be placed WITHIN these column boundaries — content must NEVER cross a column divider
- This grid is IDENTICAL for State A, State B, and State C — do not shift, resize, or redefine it

MANDATORY CONSTRUCTION RULE (DO NOT IGNORE):
All subjects must be constructed SOLELY within the column grid using horizontal line-art shading.
SOLID BLACK SHAPES, SOLID BLACK FILLS, SOLID BLACK BANDS, WAVY SOLID SHAPES, AND FILLED SILHOUETTES ARE EXPLICITLY FORBIDDEN.
This includes shadows — tonal shadows must be rendered SOLELY using horizontal lines at ~1px pitch. Solid black shadow shapes are forbidden.
Every visual element — every subject, every background area, every shadow — must be built from parallel horizontal lines at varying density. Nothing else.

WALL GEOMETRY:
- Total slats: ${config.slatCount}
- Slat width: ${config.slatWidthInches} inches
- Wall width: ${config.wallWidthFeet} ft
- Wall height: ${config.wallHeightFeet} ft

VISUAL SYSTEM:
- Side A = all ${config.slatCount} columns showing Side A content
- Side B = all ${config.slatCount} columns showing Side B content
- Emergent State C = odd columns (1, 3, 5...) show Side A content, even columns (2, 4, 6...) show Side B content
- The emergent image is NOT an unrelated third poster — it is an optical byproduct of interleaving A and B data

THE SHADING RULE (CRITICAL — THIS IS THE ONLY WAY TO CREATE TONAL VALUES):
Within each column, construct ALL tonal values using ONLY parallel horizontal black lines at varying spacing:
- Darkest areas (value 9/10): horizontal lines spaced 1px apart (tight, but each line individually distinct — NEVER merging into solid black)
- Medium-dark areas (value 7/10): horizontal lines spaced 2px apart
- Medium areas (value 5/10): horizontal lines spaced 3px apart
- Light areas (value 3/10): horizontal lines spaced 6px apart
- Lightest areas (value 1/10): horizontal lines spaced 10px apart
- White/empty areas: no lines, just the cream background showing through
There is NO other shading method. Solid fills are not "dark" — they are ERRORS.

EXPLICITLY FORBIDDEN:
- Solid black fills or shapes of any kind (including for shadows, silhouettes, or dark areas)
- Wavy bands or organic solid shapes
- Diagonal hatching or cross-hatching
- Dots, stipple, or pointillism
- Painterly texture or brush strokes
- Any graphic element that is not a horizontal line within a column
- Content crossing column divider boundaries
- Perspective, 3D depth, or environment rendering
- Color of any kind — black ink on ${config.backgroundTone} only
- Frames, borders, labels, or text
- Photographic realism

TONAL ANCHOR RULE:
- Side A and Side B are not independent images — they are tonal data layers that combine to form the emergent State C
- For Side A: tonal density must be high (tight lines) where the Emergent Subject "${config.emergentSubject}" needs darkness, and low (spaced lines) where it needs light
- For Side B: the inverse tonal relationship — dense where Side A is sparse, sparse where Side A is dense
- When odd A columns and even B columns are interleaved in State C, the Emergent Subject appears through the combined tonal sum
- Side A and Side B MUST be designed with the emergent image in mind, not as standalone compositions

DESIGN PRIORITIES:
- Bold silhouette readable from 20 feet away
- Large-scale massing, not fine detail
- Simplified tonal masses using ONLY the horizontal line density system
- Strong contrast between tight-line (dark) and spaced-line (light) zones
- Architectural precision and pixel-exact grid consistency
- All three states share the IDENTICAL grid, crop window, margins, background tone, and column alignment`;
}

export function buildSimulatorSideAPrompt(config: SlatWallSimulatorPromptConfig): string {
  const master = buildSimulatorMasterPrompt(config);

  return `${master}

GENERATE: SIDE A ONLY

CONSTRUCTION REMINDER: You MUST use the strict ${config.slatCount}-column grid and horizontal line-density shading system defined in the Master System Prompt. SOLID BLACK SHAPES ARE FORBIDDEN — including for shadows, dark mountain faces, dark sky areas, or any other dark region. The ONLY way to create darkness is with tightly-spaced (1px apart) horizontal lines that remain individually distinct.

SUBJECT: ${config.sideASubject}

HOW TO BUILD THIS IMAGE:
1. Start with the EXACT pixel-coordinate grid from the Master System Prompt (${config.slatCount} columns, same divider positions)
2. Within each column, render the "${config.sideASubject}" subject using ONLY horizontal lines at varying density
3. Dark areas of the subject = tightly spaced horizontal lines (1px apart, but each line individually visible — NEVER solid black)
4. Medium areas = horizontal lines 3px apart
5. Light areas = horizontal lines 10px apart
6. The subject must read as one unified composition across all ${config.slatCount} columns
7. Content must stay within column boundaries — do not cross divider lines

ROLE OF SIDE A:
- This is one part of a linked tri-state slat-wall system
- It must read clearly when all slats display Side A
- It must also support the emergent image "${config.emergentSubject}" when interleaved with Side B
- Do NOT generate a standalone poster — generate a strict line-density rendering on the slat grid

SUBJECT INTERPRETATION:
${config.sideAInterpretationGuidance}

TONAL ANCHOR CONSTRAINT:
Side A's tonal density must be high (tight lines) where the Emergent Subject "${config.emergentSubject}" needs darkness, and low (spaced lines) where it needs light. This ensures that when A and B strips are interleaved in State C, the emergent subject appears through the combined tonal sum.

${SIMULATOR_NEGATIVE_RULES}

RB Studio | ${config.projectCode} | Side A — ${config.sideASubject}`;
}

export function buildSimulatorSideBPrompt(config: SlatWallSimulatorPromptConfig): string {
  const master = buildSimulatorMasterPrompt(config);

  return `${master}

GENERATE: SIDE B ONLY

CONSTRUCTION REMINDER: You MUST use the strict ${config.slatCount}-column grid and horizontal line-density shading system defined in the Master System Prompt. SOLID BLACK SHAPES ARE FORBIDDEN — including for shadows, dark cloud areas, dark sky regions, or any other dark element. The ONLY way to create darkness is with tightly-spaced (1px apart) horizontal lines that remain individually distinct.

SUBJECT: ${config.sideBSubject}

HOW TO BUILD THIS IMAGE:
1. Start with the EXACT pixel-coordinate grid from the Master System Prompt (${config.slatCount} columns, same divider positions)
2. Within each column, render the "${config.sideBSubject}" subject using ONLY horizontal lines at varying density
3. Dark areas of the subject = tightly spaced horizontal lines (1px apart, but each line individually visible — NEVER solid black)
4. Medium areas = horizontal lines 3px apart
5. Light areas = horizontal lines 10px apart
6. The subject must read as one unified composition across all ${config.slatCount} columns
7. Content must stay within column boundaries — do not cross divider lines

ROLE OF SIDE B:
- This is one part of a linked tri-state slat-wall system
- It must read clearly when all slats display Side B
- It must also support the emergent image "${config.emergentSubject}" when interleaved with Side A
- Do NOT generate a standalone poster — generate a strict line-density rendering on the slat grid

SUBJECT INTERPRETATION:
${config.sideBInterpretationGuidance}

TONAL ANCHOR CONSTRAINT:
Side B's tonal density must complement Side A — where Side A is dense, Side B should be sparse, and vice versa. This inverse tonal relationship ensures the Emergent Subject "${config.emergentSubject}" appears through the combined sum when A and B strips are interleaved in State C.

${SIMULATOR_NEGATIVE_RULES}

RB Studio | ${config.projectCode} | Side B — ${config.sideBSubject}`;
}

export function buildSimulatorEmergentPrompt(config: SlatWallSimulatorPromptConfig): string {
  const master = buildSimulatorMasterPrompt(config);

  return `${master}

STATE C — DATA BLENDING OPERATION (NOT IMAGE GENERATION)

THIS IS NOT A "CREATE AN IMAGE" TASK. This is a DATA INTERLEAVING task.
Do NOT generate a separate "${config.emergentSubject}" image. Do NOT draw "${config.emergentSubject}" as a solid object.
Instead, BLEND the data from Side A and Side B by interleaving their column content.

MANDATORY INTERLEAVE PROCEDURE (FOLLOW THESE STEPS EXACTLY):

Step 1: Use the IDENTICAL ${config.slatCount}-column grid from the Master System Prompt (same pixel coordinates, same dividers, same column widths).

Step 2: Fill ODD columns (1, 3, 5, 7, 9...) with the EXACT striated horizontal-line-art patterns that would appear in Side A ("${config.sideASubject}").
- These columns show the "${config.sideASubject}" content — rendered as variable-density horizontal lines, NOT solid shapes.
- The tonal density in each odd column must match what Side A would show at that column position.

Step 3: Fill EVEN columns (2, 4, 6, 8, 10...) with the EXACT striated horizontal-line-art patterns that would appear in Side B ("${config.sideBSubject}").
- These columns show the "${config.sideBSubject}" content — rendered as variable-density horizontal lines, NOT solid shapes.
- The tonal density in each even column must match what Side B would show at that column position.

Step 4: The sum total of these interleaved alternating striated columns ("${config.sideASubject}" data + "${config.sideBSubject}" data) must result in the highly simplified silhouette of "${config.emergentSubject}".
- "${config.emergentSubject}" should look like an optical artifact or holographic blip formed by the combined patterns, NOT a solid object.
- Dark areas of "${config.emergentSubject}" = tight horizontal lines on BOTH the odd (A) and even (B) columns in that region.
- Light areas of "${config.emergentSubject}" = widely spaced horizontal lines on BOTH the odd (A) and even (B) columns in that region.

SUBJECT INTERPRETATION:
${config.emergentInterpretationGuidance}

WHAT THE RESULT MUST LOOK LIKE:
- You can see alternating vertical strips of "${config.sideASubject}" and "${config.sideBSubject}" patterns
- When you step back and view the full image, the combined tonal pattern forms the silhouette of "${config.emergentSubject}"
- "${config.emergentSubject}" is NOT a drawn object — it is an EMERGENT PERCEPTION from the interleaved data
- It must look like an actual physical optical result of combining two printed slat faces

EXPLICITLY FORBIDDEN FOR STATE C:
- Do NOT generate "${config.emergentSubject}" as a standalone solid silhouette, graphic, or poster
- Do NOT draw "${config.emergentSubject}" as an object and then place a grid on top
- Do NOT render it as a transparent overlay or ghosted layer
- Do NOT use solid black fills for any part of "${config.emergentSubject}"
- The ONLY way "${config.emergentSubject}" may be visible is through the combined tonal sum of interleaved A/B column data

${SIMULATOR_NEGATIVE_RULES}

RB Studio | ${config.projectCode} | Emergent — ${config.emergentSubject}`;
}

// ─── COMBO LOOKUP ─────────────────────────────────────────────

export function findImageCombo(
  sideA: string,
  sideB: string,
  emergent: string,
): SlatWallImageCombo | null {
  // Exact match
  const exact = SLAT_WALL_IMAGE_COMBOS.find(
    (c) =>
      c.sideA.toLowerCase() === sideA.toLowerCase() &&
      c.sideB.toLowerCase() === sideB.toLowerCase() &&
      c.emergent.toLowerCase() === emergent.toLowerCase(),
  );
  if (exact) return exact;

  // Match by emergent subject
  const byEmergent = SLAT_WALL_IMAGE_COMBOS.find(
    (c) => c.emergent.toLowerCase() === emergent.toLowerCase(),
  );
  if (byEmergent) return byEmergent;

  return null;
}

export function buildDefaultGuidance(subject: string, role: "sideA" | "sideB" | "emergent"): string {
  if (role === "emergent") {
    return `Interpret the ${subject} as a bold recognizable silhouette with simplified massing. Avoid fine detail and internal texture. Favor strong shape, large black/cream grouping, and immediate recognizability so the ${subject} remains legible through alternating slat interleaving.`;
  }
  return `Interpret the ${subject} as bold simplified masses with strong silhouette and broad value zones. Avoid fine detail, small texture, or photographic rendering. Favor large-scale forms that remain legible across the slat wall.`;
}
