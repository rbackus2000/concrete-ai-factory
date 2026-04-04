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

Footer: "RB Studio" on the left, project ref, "${project.code}-REV A", "CONFIDENTIAL - INTERNAL USE ONLY".

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

Title block: "RB Studio | ${project.code} | PIVOT ASSEMBLY DETAIL"`,
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
- include title block: "RB Studio | ${project.code} | SYSTEM ARCHITECTURE"`,
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
The Rotating Slat Image Wall System shall operate as a synchronized, programmable kinetic architectural installation that rotates between two fixed display states:
- Position A (${fmt(c.rotationAngleA)}°) = Face A visible = "${project.positionAName}"
- Position B (${fmt(c.rotationAngleB)}°) = Face B visible = "${project.positionBName}"
The system shall automatically rotate on a configurable time delay, hold each position for a programmable dwell period, and confirm final alignment before the next motion cycle begins.

SYSTEM ARCHITECTURE:
- Synchronized zoned drive strategy — grouped slats per zone, not independent motors per slat
- Master PLC/controller coordinates dwell timing, move commands, position confirmation, fault handling
- Estimated ${Math.ceil(c.totalSlatCount / 7)} zones of approximately ${Math.min(7, c.totalSlatCount)} slats each

POWER ARCHITECTURE:
- System voltage: 24V DC for motion and controls
- Facility provides dedicated building power feed to controls enclosure
- Building power converted locally to regulated 24V DC
- Internal distribution: 24V DC motor power, 24V DC control power, sensor power, Ethernet/network
- Optional PoE for HMI terminals, network gateways, diagnostics only (not primary motor power)

MOTOR AND DRIVE STRATEGY:
- Low-voltage geared motor system or 24V DC servo/BLDC gearmotor per synchronized zone
- Zone transmission: timing belt, chain drive, gear track, or mechanically linked shafting
- Motion goals: smooth controlled rotation, synchronized arrival, repeatable alignment, low vibration
- Controlled acceleration/deceleration profiles

AUTOMATIC DWELL CYCLE:
1. System startup → verify healthy power, no active fault
2. Confirm home/reference position
3. Move to Position A → hold for configurable dwell time
4. Rotate to Position B → confirm alignment → hold for configurable dwell time
5. Rotate back to Position A → repeat cycle
Field-programmable: dwell times, transition speed, acceleration/deceleration profiles, scheduled hours, maintenance disable

POSITION SENSING AND CONFIRMATION:
- Primary feedback: motor/drive/controller position data
- Secondary confirmation: external physical position sensing (magnetic proximity, hall-effect, optical, or encoder-based)
- Required states: Position A reached, Position B reached, synchronization maintained, no jam/stall
- Fault threshold: if position differs beyond tolerance → stop motion, log fault, require authorized reset

SAFETY AND FAULT HANDLING:
- Emergency stop at controls enclosure + optional remote E-stop
- Fault conditions monitored: motion failure, zone sync error, over-current/torque, sensor failure, obstruction, power interruption
- Fault response: stop all motion, hold safe state, log fault, require reset
- Maintenance mode: automatic-cycle disable, reduced-speed manual jog for service

CONTROLLER REQUIREMENTS:
- Compact industrial PLC or automation controller
- HMI with: Auto Mode, Manual Mode, Dwell Settings, Position Status, Fault/Alarm Status, Service Mode
- Optional: Ethernet, remote diagnostics, PoE-powered HMI, building management integration

TOP FRAME MOTOR ENCLOSURE:
- Concealed housing for: motors, transmission, control nodes, power distribution, sensors, wiring
- Removable access panels for motor replacement, transmission service, sensor replacement, wiring service

BOTTOM FRAME SUPPORT:
- Lower bearing support, alignment support, guided rotation support
- Minimal service access for inspection and adjustment

CABLING:
- Low-voltage motor power, control wiring, sensor wiring, Ethernet/network
- Concealed raceways, motion-rated flexible paths, organized service loops
- Separation between motor power, control/sensor, and data wiring
- All wiring, zones, sensors, and service points permanently labeled

COMMISSIONING:
- Verify: rotation direction, zone synchronization, Position A/B alignment, dwell timing, fault handling, sensor operation, manual jog
- Service access to: motor enclosure, controller, sensors, transmission, lower bearings

BASIS-OF-DESIGN SUMMARY:
- Motion/Control Power: 24V DC
- Communications: Ethernet / optional PoE for interface only
- Motion Strategy: zoned synchronized drive (${Math.ceil(c.totalSlatCount / 7)} zones, ~${Math.min(7, c.totalSlatCount)} slats/zone)
- Controller: PLC or compact industrial automation controller
- Feedback: drive/controller feedback + physical position sensing
- Operation: automatic timed dwell-cycle rotation
- Safety: E-stop, fault stop, maintenance lockout, manual jog
- Enclosure: concealed top frame with removable service access

ENGINEERING NOTE:
This is a production-aware basis of design. Final motor sizing, current draw, power-supply sizing, controller selection, sensor selection, safety compliance, and enclosure design shall be verified during prototype development and final engineering.`,

    `12. INSTALL SEQUENCE
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
7. Set all slats to Position A — verify full image reads correctly across entire wall
8. Rotate all slats to Position B — verify second image reads correctly
9. Check slat spacing consistency — adjust any drifted pivots
10. Final QC signoff on both positions`,

    `13. QC CHECKLIST
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

    `14. FAILURE POINTS (READ THIS)
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
