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
      return `Generate a ultra-realistic architectural render of a kinetic rotating slat wall in Position A, showing the complete "${project.positionAName}" composite image.

${base}

The image shows all ${c.totalSlatCount} slats rotated to Position A (${fmt(c.rotationAngleA)}°), with each slat displaying its Face A artwork slice. The complete wall reads as one unified large-format image: ${project.positionADescription || project.positionAName}.

The wall is ${wallWidthFeet(project)} feet wide by ${heightFeet(project)} feet tall. Each slat is ${fmt(c.slatWidth)}" wide thin GFRC concrete with UV-printed artwork over sealed matte concrete surface. Show the subtle vertical gaps (${fmt(c.slatSpacing)}") between slats — the image reads continuously despite the physical slat divisions.

Environment: Premium architectural interior — museum, hotel lobby, or high-end residential. Soft architectural lighting that reveals the artwork and the materiality of the concrete slats. The support frame (top and bottom aluminum track) should be visible but minimal.

Style: Premium, museum-quality, architecturally refined. Not a billboard — this is a kinetic art installation.

${creativeDirection}

Negative constraints: No billboard aesthetics. No chunky slats. No disconnected image slices. No generic signage. No fantasy mechanics.

Footer: RB Studio | ${project.code}`;

    case "IMAGE_RENDER_B":
      return `Generate a ultra-realistic architectural render of a kinetic rotating slat wall in Position B, showing the complete "${project.positionBName}" composite image.

${base}

The image shows all ${c.totalSlatCount} slats rotated to Position B (${fmt(c.rotationAngleB)}°), with each slat displaying its Face B artwork slice. The complete wall reads as one unified large-format image: ${project.positionBDescription || project.positionBName}.

The wall is ${wallWidthFeet(project)} feet wide by ${heightFeet(project)} feet tall. Each slat is ${fmt(c.slatWidth)}" wide thin GFRC concrete with UV-printed artwork over sealed matte concrete surface. Show the subtle vertical gaps (${fmt(c.slatSpacing)}") between slats.

Environment: Same architectural setting as Position A but the wall now displays a completely different image. Emphasize the transformative effect — same physical wall, different artwork.

Style: Premium, museum-quality, architecturally refined.

${creativeDirection}

Negative constraints: No billboard aesthetics. No chunky slats. No disconnected image slices. No generic signage. No fantasy mechanics.

Footer: RB Studio | ${project.code}`;

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

function buildSlatWallBuildPacketText(
  project: SlatWallProjectData,
  creativeDirection: string,
): string {
  const c = project.config;
  const ww = wallWidthInches(project);

  const sections = [
    `1. PROJECT OVERVIEW
Project: ${project.code} — ${project.name}
Client: ${project.clientName || "RB Studio"}
Location: ${project.location || "TBD"}
Designer: ${project.designer || "RB Studio"}
Design Intent: Premium kinetic rotating vertical slat wall installation. ${c.totalSlatCount} thin GFRC concrete slats with UV-printed artwork revealing two complete composite images.
Position A ("${project.positionAName}"): ${project.positionADescription || "Full-wall composite image"}
Position B ("${project.positionBName}"): ${project.positionBDescription || "Full-wall composite image"}`,

    `2. SYSTEM SUMMARY
Slat Count: ${c.totalSlatCount}
Wall Dimensions: ${fmt(ww)}" W x ${fmt(c.slatHeight)}" H (${(ww / 12).toFixed(1)} ft x ${heightFeet(project)} ft)
Individual Slat: ${fmt(c.slatWidth)}" W x ${fmt(c.slatHeight)}" H x ${fmt(c.slatThickness)}" T
Slat Material: Thin GFRC (Glass Fiber Reinforced Concrete)
Finish System: Sealed concrete + UV print + protective clear coat
Support Frame: ${c.supportFrameType || "Engineered aluminum top/bottom track"}
Pivot System: ${c.pivotType || "Concealed vertical pin pivot"}
Rotation: Position A = ${fmt(c.rotationAngleA)}°, Position B = ${fmt(c.rotationAngleB)}°
Slat Spacing: ${fmt(c.slatSpacing)}"`,

    `3. SLAT CONSTRUCTION
Build-up (inside out):
- GFRC substrate: ${fmt(c.slatThickness)}" thick, fiber-reinforced single-layer casting
- Surface prep: sand printable face, clean, flatten to print tolerance
- Sealer: compatible UV-print-base penetrating sealer
- Artwork: UV direct print over sealed concrete face
- Top coat: matte or satin clear protective coating
- Edge finish: eased edges, sealed, no exposed aggregate

Weight per slat: approximately ${(c.slatWidth * c.slatHeight * c.slatThickness * 0.08).toFixed(1)} lbs (estimated)
Reinforcement: AR glass fiber at 2-3% by weight
Each slat has TWO printable faces (Face A and Face B)`,

    `4. SUPPORT FRAME / PIVOT SYSTEM
Top Frame: ${c.supportFrameType || "Engineered aluminum channel"} — continuous track spanning ${fmt(ww)}" (${(ww / 12).toFixed(1)} ft)
Bottom Frame: Matching bottom track with floor anchoring
Pivot Locations: Top center and bottom center of each slat
Rotation Stops: Fixed positions at ${fmt(c.rotationAngleA)}° (Position A) and ${fmt(c.rotationAngleB)}° (Position B)
Alignment Control: Precision pivot pins with stop mechanisms
Tolerance: Pivot alignment +/- 1/32" per slat
Installation Anchoring: Structural connection to ceiling/floor structure required`,

    `5. ARTWORK APPLICATION METHOD
Substrate: Cured and finished GFRC slat
Face Prep: Surface flattening, cleaning, print-ready preparation
Sealer: Compatible UV-print-base penetrating sealer
Artwork: UV direct print over sealed concrete
Resolution: Minimum 150 DPI at final print size
Color Management: ICC profile matched to concrete substrate
Top Protection: Matte or satin clear protective coating
Edge Masking: Print boundaries masked ${fmt(c.slatSpacing / 2)}" from each edge
Cure/Protection: 24-hour cure before handling, edge protection during transit`,

    `6. POSITION LOGIC
Position A: All slats rotated to ${fmt(c.rotationAngleA)}° — Face A visible — displays "${project.positionAName}"
Position B: All slats rotated to ${fmt(c.rotationAngleB)}° — Face B visible — displays "${project.positionBName}"
Rotation Direction: All slats rotate same direction (clockwise from top view)
Leading Edge: Right edge when viewed from front
Orientation Arrow: Marked on top edge of each slat pointing toward Face A
Installation Alignment: Slat S-01 at left end of wall, S-${String(c.totalSlatCount).padStart(2, "0")} at right end`,

    `7. SLAT SCHEDULE
${Array.from({ length: Math.min(c.totalSlatCount, 36) }, (_, i) => {
  const n = i + 1;
  const id = `S-${String(n).padStart(2, "0")}`;
  const fA = `A-${String(n).padStart(2, "0")}`;
  const fB = `B-${String(n).padStart(2, "0")}`;
  return `${id} | Pos ${n} | ${fA} | ${fB} | ${fmt(c.slatWidth)}" x ${fmt(c.slatHeight)}" x ${fmt(c.slatThickness)}" | Standard`;
}).join("\n")}`,

    `8. QC REQUIREMENTS
Dimensional: Width +/- 1/32", Height +/- 1/16", Thickness +/- 1/32", Flatness within 1/16" over full height
Finish: Sealer consistency, print adhesion, clear coat uniformity, no color shift
Image: Correct slice on correct slat, Face A/B not swapped, no reversed orientation, no image drift, tonal continuity across adjacent slats
Assembly: Pivot fit, frame fit, stop angle accuracy, slat spacing consistency
Installed: Position A full-image read test, Position B full-image read test`,

    `9. FAILURE POINTS (READ THIS)
- Incorrect slat order — destroys image continuity
- Slat installed backward (Face A/B swap) — wrong image on wrong position
- Poor print registration — visible misalignment between adjacent slats
- Low contrast between image slices — image reads as fragmented
- Edge drift from print boundaries — visible banding
- Warped slat — won't align with neighbors
- Pivot misalignment — uneven rotation, visible gap inconsistency
- Stop-angle inaccuracy — image doesn't align at designed position`,

    `10. INSTALL SEQUENCE
1. Install top and bottom frame tracks — verify level and plumb
2. Install pivot hardware at each slat position
3. Verify slat numbering matches wall position (S-01 = leftmost)
4. Hang slats left to right in sequence
5. Per slat: verify orientation arrow, Face A direction, pivot engagement
6. Set all slats to Position A — verify full image reads correctly
7. Rotate all slats to Position B — verify second image reads correctly
8. Adjust any misaligned stops
9. Final QC signoff on both positions`,
  ];

  return sections.join("\n\n") + (creativeDirection ? `\n\n${creativeDirection}` : "");
}
