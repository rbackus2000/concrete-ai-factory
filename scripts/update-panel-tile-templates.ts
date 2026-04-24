/**
 * Update the 4 panel / wall-tile IMAGE_RENDER templates to surface the SKU's
 * distinctive relief/texture by interpolating {{productType}} and {{productDescription}}.
 *
 * Without these fields, the templates only describe edge profile + finish +
 * dimensions — leaving Gemini to render a plain blank panel for designs whose
 * character lives in the SKU description (stave grooves, kinetic fins, etc.).
 */

import path from "node:path";
import { config as loadDotenv } from "dotenv";
loadDotenv({ path: path.resolve(process.cwd(), ".env.local"), quiet: true });
loadDotenv({ path: path.resolve(process.cwd(), ".env"), quiet: true });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TEMPLATES: Array<{ key: string; body: string }> = [
  {
    key: "panel_image_sample",
    body: `Studio-quality render of the {{skuCode}} {{productName}} as a single tile or panel sample on a clean background.

Product type: {{productType}}.
Design intent: {{productDescription}}

Focus:
Render the panel so its distinctive surface relief, carving, or texture described above is immediately and unmistakably visible. Edge profile {{edgeProfile}}. {{finish}} finish — {{finishDescription}}. Thickness {{tileThickness}} inches, module size {{tileLength}} x {{tileWidth}} inches.

Render intent:
Catalog or sample image. Angle the panel slightly (three-quarter) so the relief casts clear shadows; use raking side light to make the surface pattern unmistakably readable. No installation clutter.

Negative constraints:
No flat featureless rectangle when the design specifies surface relief. No bathroom fixtures. No furniture context. No warped sample. No unrealistic texture exaggeration.`,
  },
  {
    key: "panel_image_installed",
    body: `Lifestyle interior photograph of the {{skuCode}} {{productName}} installed as a full-height wall treatment in a premium hospitality or refined residential interior.

Product type: {{productType}}.
Design intent: {{productDescription}}

Object:
A premium cast-concrete feature wall whose distinctive surface relief, carving, or texture (described above) must be unmistakably visible across every visible panel. {{finish}} finish — {{finishDescription}}. Repeatable manufacturable geometry. Module size approximately {{tileLength}} x {{tileWidth}} inches, thickness {{tileThickness}} inches. Crisp edge profile {{edgeProfile}}; joint lines visible but subordinate to the surface pattern.

Installation and composition:
The wall runs along one side of an inhabited interior — a boutique hotel lobby, a lounge, a refined living room, or a hospitality reception area. The wall is clearly the focal element, but the composition also shows the livable space around it: one or two upholstered armchairs or a low sofa at a comfortable distance, a warm floor lamp or table lamp casting soft light, a side table or small rug grounding the scene. The viewer feels like they are walking through a refined interior, not staring at a detail shot. Wide-to-medium interior shot at relaxed eye-level; the wall stretches through the frame and recedes into the space with comfortable parallax. No people.

Lighting:
Warm, ambient interior lighting — soft daylight from windows outside the frame or from concealed coves, combined with incandescent warmth from visible floor or table lamps. Accent light grazes the panel relief enough to reveal its pattern, but the overall feel is lived-in and integrated, not a dramatized isolation shot.

Material:
{{finish}} GFRC — {{finishDescription}}. Show realistic surface detail consistent with this finish technique. Natural material warmth; no plasticky sheen.

Render intent:
Editorial hospitality-interior photograph. The viewer should instantly understand that this panel lives in real rooms — its scale, repeat logic, relief depth, and material are all legible at this viewing distance, and so is the space it creates.

Negative constraints:
No flat featureless wall when the design specifies surface relief. No faucet, drain, or sink bowl geometry. No staged product-photography isolation. No extreme raking sidelight that turns the wall into a shadow abstract. No chaotic pattern distortion. No impossible grout or joint spacing. No people. No visible brand logos. No surreal HDR halos.`,
  },
  {
    key: "panel_image_repeat_pattern",
    body: `Ultra-realistic product render showing multiple {{skuCode}} {{productName}} units arranged in a repeat pattern.

Product type: {{productType}}.
Design intent: {{productDescription}}

Focus:
Demonstrate how the module repeats, aligns, and reads across a surface. The distinctive relief, texture, or carving described above must be visible on every module and across the pattern as a whole. {{finish}} finish — {{finishDescription}}. Module size {{tileLength}} x {{tileWidth}} inches.

Environment:
Minimal architectural context or semi-studio layout that keeps attention on the repeating pattern. Raking light across the surface to reveal relief.

Negative constraints:
No flat featureless panels when the design specifies surface relief. No faucet. No drain. No unrelated furniture. No pattern distortion. No inconsistent module sizing.`,
  },
  {
    key: "wall-tile_image_repeat_pattern",
    body: `Ultra-realistic product render showing multiple {{skuCode}} {{productName}} tiles arranged in a repeat pattern.

Product type: {{productType}}.
Design intent: {{productDescription}}

Focus:
Demonstrate how the tile repeats, aligns, and reads across a surface. The distinctive face texture, carving, or relief described above must be visible on every tile across the pattern. Edge profile {{edgeProfile}}. {{finish}} finish — {{finishDescription}}. Module size {{tileLength}} x {{tileWidth}} inches, thickness {{tileThickness}} inches.

Environment:
Minimal architectural context or semi-studio layout that keeps attention on the repeating pattern. Raking light across the surface to reveal relief and grout lines.

Negative constraints:
No flat featureless tiles when the design specifies face relief. No faucet. No drain. No unrelated furniture. No pattern distortion. No inconsistent tile sizing.`,
  },
];

async function main() {
  for (const t of TEMPLATES) {
    const result = await prisma.promptTemplate.updateMany({
      where: { key: t.key },
      data: { templateBody: t.body },
    });
    console.log(`updated ${t.key} — ${result.count} row(s)`);
  }
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("failed:", err);
  await prisma.$disconnect();
  process.exit(1);
});
