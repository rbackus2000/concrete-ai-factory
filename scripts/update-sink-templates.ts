/**
 * Updates the sink image prompt templates to use dynamic shape descriptions
 * instead of hardcoded "rectilinear" language that only works for rectangular sinks.
 *
 * Run: npx tsx scripts/update-sink-templates.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CATALOG_BODY = `Studio-quality product render of the {{skuCode}} {{productName}} on a clean minimal background.

Product description:
{{productDescription}}

Object:
A premium GFRC {{shapeLabel}} vessel sink, approximately {{outerLength}} x {{outerWidth}} x {{outerHeight}} inches, {{finish}} finish — {{finishDescription}}.
{{#if isRound}}The sink is a perfectly round/circular bowl shape with gently tapered walls. The outer profile is a clean circle when viewed from above.{{/if}}
{{#if isRound}}{{else}}The outer geometry is a strict rectilinear box shape. Interior features an organically sculpted basin.{{/if}}

Render intent:
This is a catalog-style hero product image. Keep the focus entirely on the sink. The object should appear realistic, manufacturable, and premium. Use balanced neutral lighting that clearly reveals the basin form, edge thickness, and material texture consistent with the specified finish.

Material and geometry:
Believable GFRC wall thickness around {{wallThickness}} inches, crisp outer silhouette, consistent geometry, no warping, no unrealistic overhangs. Surface must show {{finishDescription}}.

Hardware:
{{#if showDrain}}Include one centered round drain cover, clearly visible and proportional.{{/if}}
{{#if showFaucet}}Only include faucet if explicitly requested, otherwise sink only.{{/if}}

Background:
Minimal clean architectural background in {{backgroundStyle}}, no visual clutter, no distracting props.

Negative constraints:
No bathroom clutter.
No extra accessories.
No surreal sculpting.
No missing drain when requested.
No uneven wall thickness.
{{#if isRound}}No rectangular shape — this sink MUST be round/circular.{{/if}}`;

const LIFESTYLE_BODY = `Ultra-realistic architectural product render of the {{skuCode}} {{productName}}.

Product description:
{{productDescription}}

Primary object:
A premium GFRC {{shapeLabel}} vessel sink measuring approximately {{outerLength}} x {{outerWidth}} x {{outerHeight}} inches, {{finish}} finish — {{finishDescription}}.
{{#if isRound}}The sink is a perfectly round/circular bowl shape with smooth tapered walls from a wide rim to a narrower flat base. Clean minimal sculptural profile.{{/if}}
{{#if isRound}}{{else}}The outer form is a strict minimal rectangular box. The interior features a sculpted organic basin inspired by erosion and water-carved stone. The key design feature is the contrast between the rigid rectilinear exterior and the fluid carved interior.{{/if}}

Geometry and realism:
Keep the object realistic, premium, and manufacturable. Show believable wall thickness around {{wallThickness}} inches, bottom thickness around {{bottomThickness}} inches, and top lip thickness around {{topLipThickness}} inches. No visible warp, no distorted proportions, no inconsistent wall thickness, no fantasy geometry.

Hardware:
{{#if showDrain}}Show one clearly visible centered round brushed stainless steel drain cover with believable scale.{{/if}}
{{#if showFaucet}}Show one clearly visible refined wall-mounted or deck-mounted brushed stainless steel faucet, fully visible in frame.{{/if}}

Environment:
Place the sink in a high-end architectural bathroom with restrained styling, premium materials, and soft natural or architectural lighting. Keep the composition product-focused and clean.

Material:
{{finish}} GFRC — {{finishDescription}}. Show realistic surface detail consistent with this finish technique.

Composition:
Use a {{cameraAngle}} view. Keep the full sink clearly visible. {{#if showFaucet}}Do not crop out the faucet.{{/if}} {{#if showDrain}}Do not hide the drain in shadow or low contrast.{{/if}}

Negative constraints:
No missing faucet when faucet is requested.
No missing drain when drain is requested.
No off-center drain.
No warped concrete.
No surreal carving.
No extra fixtures.
{{#if isRound}}No rectangular shape — this sink MUST be round/circular.{{/if}}`;

const DETAIL_BODY = `Ultra-realistic detail render of the {{skuCode}} {{productName}} focusing on materiality, edge quality, and basin sculpting.

Product description:
{{productDescription}}

Focus:
Show the premium GFRC surface with {{finish}} finish — {{finishDescription}}.
{{#if isRound}}This is a round/circular vessel bowl. Emphasize the smooth curved rim, tapered walls, and sculptural bowl form.{{/if}}
{{#if isRound}}{{else}}Emphasize the surface texture and the transition between rigid outer geometry and organic erosion-shaped basin surfaces.{{/if}}

Detail priorities:
- clear reading of the finish texture ({{finishDescription}})
- clear reading of wall thickness
- smooth internal transitions
- premium precast finish
- believable manufacturable radius transitions
{{#if showDrain}}- visible drain cover integration{{/if}}

Composition:
Close three-quarter detail crop with soft directional light. Keep the sink form legible and premium.

Negative constraints:
No rough defects.
No cracked surface.
No exaggerated brutalism.
No generic flat tray basin.
{{#if isRound}}No rectangular shape — this is a round/circular sink.{{/if}}`;

async function main() {
  console.log("Updating sink image templates...\n");

  const updates = [
    { key: "sink_image_catalog", body: CATALOG_BODY },
    { key: "sink_image_lifestyle", body: LIFESTYLE_BODY },
    { key: "sink_image_detail", body: DETAIL_BODY },
  ];

  for (const { key, body } of updates) {
    const result = await prisma.promptTemplate.updateMany({
      where: { key, status: "ACTIVE" },
      data: { templateBody: body },
    });
    console.log(`  ${key}: updated ${result.count} template(s)`);
  }

  console.log("\nDone.");
}

main()
  .catch((e) => {
    console.error("Failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
