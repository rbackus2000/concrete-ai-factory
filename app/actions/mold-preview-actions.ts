"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { generateImageWithGemini } from "@/lib/services/image-generation-service";

const MOLD_PREVIEW_PROMPTS: Record<string, string> = {
  "S1-EROSION": `Commercial product photography of a handcast GFRC concrete vessel sink called Erosion. Dramatic thick-walled rectangular concrete basin with organic erosion-carved interior. Exterior: disciplined rectangular form, Matte Natural Gray finish. Interior: fluid water-carved geometry. Walls 0.6 inches thick. Top rim flat and polished. Shot on warm white seamless background. Two softbox lights 45 degrees revealing texture. 3/4 view from slightly above. Hyperrealistic physical material photography. Premium catalog quality.`,
  "S2-CANYON": `Commercial product photography of a handcast GFRC concrete ramp sink called Canyon. Elongated form with front face angling down to a narrow trough at rear with slot drain. Matte Charcoal finish. Sharp geometric lines. Shot on warm white seamless background. Clean studio lighting. 3/4 view slightly above. Hyperrealistic physical concrete material.`,
  "S3-TIDE": `Commercial product photography of a handcast GFRC concrete rectangular basin sink called Tide. Compact footprint, gently pitched bottom toward rear grid drain. Matte Warm White finish. Soft radius transitions at bottom edges. Shot on warm white seamless background. 3/4 view. Hyperrealistic.`,
  "S4-FACET": `Commercial product photography of a handcast GFRC concrete vessel sink called Facet. Angular faceted basin interior with crisp intersecting planes — jewel-cut appearance. Matte Slate finish. Strict rectangular outer shell. Shot on warm white seamless background. Dramatic lighting revealing facet edges. 3/4 view. Hyperrealistic.`,
  "S5-SLOPE": `Commercial product photography of a handcast GFRC concrete ramp sink called Slope. Long linear ramp with single-plane basin angling front to back toward slot drain. Matte Sand finish. Modern trough aesthetic. Shot on warm white seamless background. 3/4 view. Hyperrealistic.`,
  "S6-TIMBER": `Commercial product photography of a handcast GFRC Woodform vessel sink called Timber. Real walnut slab mold casting with authentic wood grain texture — knots, fissures, and end grain in concrete. Woodform Dune finish — warm wood tones in concrete. Shot on warm white seamless background. 3/4 view. Hyperrealistic.`,
  "S7-ROUND": `Commercial product photography of a handcast GFRC concrete round vessel bowl sink. Sits on flat surface. Gently tapered walls, centered round drain. Classic Frost white finish. Clean minimal profile. Shot on warm white seamless background. 3/4 view. Hyperrealistic.`,
  "S8-OVAL": `Commercial product photography of a handcast GFRC concrete oval vessel bowl sink. Elongated egg shape, gently tapered walls. Classic Pewter finish — warm medium gray. Shot on warm white seamless background. 3/4 view. Hyperrealistic.`,
  "S9-RIDGE": `Commercial product photography of a handcast GFRC concrete round vessel sink called The Ridge. Warm white near-cream color. Circular form with approximately 18 horizontal ridges wrapping the full exterior circumference — like geological strata or topographic rings. Each ridge casts a thin shadow line. Smooth polished interior contrasts with ribbed exterior. Flat clean rim at top. Shot on warm beige seamless background. Soft natural studio lighting. 3/4 view from slightly above. Hyperrealistic physical concrete photography.`,
  "S10-CHANNEL": `Commercial product photography of a handcast GFRC concrete oval vessel sink called The Channel. Natural Portland gray raw concrete color. Deep vertical channels carved into the full exterior perimeter — approximately 48 channels running floor to rim. Dense fluted texture referencing hand-carved stone. Smooth polished interior basin contrasts with the rough channeled exterior. Flat smooth rim band at top. Shot on dark gray concrete seamless background. Dramatic side lighting emphasizing channel depth and shadow play. 3/4 view from slightly above. Physical concrete material. Hyperrealistic.`,
  "S13-SPHERE": `A close-up, high-resolution architectural photograph capturing a minimalist, hand-cast dark charcoal gray concrete vessel sink. The sink is a perfectly symmetrical semi-spherical bowl with a smooth, velvety matte finish and a uniformly thin rim. Water flows gently from a sleek, wall-mounted brushed stainless steel spout faucet and splashes softly into the basin's bottom, draining through a subtle, circular slot drain. The sink is positioned on a floating, thick wooden countertop made of reclaimed white oak with a deep, rough-hewn grain texture, contrasting sharply with the concrete. To the right of the sink, a few smooth, dark river stones are stacked on the wood. The background wall is a simple, subtly textured lime-wash finish in a warm light gray. Diffused natural daylight streams in from a large window to the side, highlighting the concrete's texture and the water flow. The perspective is eye-level, slightly angled to emphasize the basin and the wooden counter's grain. The focus is sharp on the sink and the water, with a soft blur in the background. The scene is quiet, minimalist, and luxurious.`,
  "S12-STRATA": `Commercial product photography of a handcast GFRC concrete vessel sink called Strata. Monolithic rectangular form with deeply stepped topographic interior. Multiple sharp concentric rings radiate from an asymmetric deep pooling area — like geological stratification or a topographic contour map carved in stone. Dramatic depth variation with precise contour lines. Classic Frost off-white finish with fine-grain matte texture. Round drain at deepest contour. Countertop vessel mount. Shot on warm white seamless background. Clean studio lighting revealing contour shadows. 3/4 view from slightly above. Hyperrealistic physical concrete material. Premium catalog quality.`,
  "T1-SLATE": `Commercial product photography of a large format handcast GFRC concrete wall tile called The Slate Tile. 12x24 inch format. Natural cleft surface texture — raw concrete gray color. Installed on a feature wall, slightly offset layout. Side lighting reveals natural surface variation. Clean architectural photography. Hyperrealistic material texture.`,
  "T2-RIDGE": `Commercial product photography of handcast GFRC concrete wall tiles called The Ridge Tile. 8x8 inch square format. Warm white color. Horizontal ridges running full width — 6 ridges per tile. Installed in a grid pattern on a bathroom feature wall. Each ridge casts a thin shadow line. Soft architectural lighting. Hyperrealistic.`,
  "T3-CHANNEL": `Commercial product photography of handcast GFRC concrete wall tiles called The Channel Tile. 6x18 inch tall format. Raw concrete gray. Deep vertical channels — 8 per tile — running full height. Installed vertically on a full-height bathroom feature wall. Dramatic shadow play from channels. Architectural lighting. Hyperrealistic physical concrete material.`,
  "T4-MONOLITH": `Commercial product photography of large format handcast GFRC concrete wall tiles called The Monolith Tile. 16x32 inch format. Charcoal gray. Completely smooth face — no texture, no relief. Minimal rectified joints. Installed floor to ceiling in a luxury bathroom. Clean diffused studio lighting. Hyperrealistic. Premium catalog quality.`,
};

function getPromptForSku(skuCode: string, productName: string): string {
  return (
    MOLD_PREVIEW_PROMPTS[skuCode] ??
    `Commercial product photography of a handcast GFRC concrete product called ${productName}. Premium architectural concrete. Studio lighting on white seamless background. Hyperrealistic.`
  );
}

export async function generateMoldPreviewAction(input: {
  skuCode: string;
  skuId: string;
  productName: string;
}): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
  const promptText = getPromptForSku(input.skuCode, input.productName);

  // Create a GeneratedOutput record to track this
  const output = await prisma.generatedOutput.create({
    data: {
      skuId: input.skuId,
      title: `${input.skuCode} MOLD PREVIEW`,
      outputType: "IMAGE_RENDER",
      status: "QUEUED",
      inputPayload: {
        skuCode: input.skuCode,
        source: "mold-generator-preview",
      } as Prisma.InputJsonValue,
      outputPayload: {
        promptText,
        imageStatus: "QUEUED",
      } as Prisma.InputJsonValue,
      generatedBy: "mold-generator-preview",
    },
  });

  try {
    const result = await generateImageWithGemini({
      generatedOutputId: output.id,
      promptText,
      suffix: "mold-preview",
    });

    await prisma.generatedImageAsset.create({
      data: {
        generatedOutputId: output.id,
        promptTextUsed: promptText,
        modelName: result.modelName,
        imageUrl: result.imageUrl,
        filePath: result.filePath,
        status: "GENERATED",
        width: result.width,
        height: result.height,
        metadataJson: result.metadataJson,
      },
    });

    await prisma.generatedOutput.update({
      where: { id: output.id },
      data: {
        status: "GENERATED",
        outputPayload: {
          promptText,
          imageStatus: "GENERATED",
          imageUrl: result.imageUrl,
        } as Prisma.InputJsonValue,
      },
    });

    return { success: true, imageUrl: result.imageUrl ?? undefined };
  } catch (error) {
    await prisma.generatedOutput.update({
      where: { id: output.id },
      data: {
        status: "FAILED",
        outputPayload: {
          promptText,
          imageStatus: "FAILED",
          error: error instanceof Error ? error.message : "Unknown error",
        } as Prisma.InputJsonValue,
      },
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : "Image generation failed.",
    };
  }
}
