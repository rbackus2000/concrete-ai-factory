import { z } from "zod";

import { outputTypeSchema, type SkuCategory } from "./domain";

export const imageScenePresetValues = [
  "lifestyle",
  "catalog",
  "detail",
  "installed",
  "sample",
  "repeat_pattern",
] as const;

export const imageScenePresetSchema = z.enum(imageScenePresetValues);

export const imageScenePresetLabelMap: Record<ImageScenePreset, string> = {
  lifestyle: "Lifestyle",
  catalog: "Catalog",
  detail: "Detail",
  installed: "Installed",
  sample: "Sample",
  repeat_pattern: "Repeat Pattern",
};

export const imageScenePresetOptionsByCategory: Record<
  SkuCategory,
  readonly ImageScenePreset[]
> = {
  VESSEL_SINK: ["lifestyle", "catalog", "detail"],
  FURNITURE: ["lifestyle", "catalog", "detail"],
  PANEL: ["installed", "sample", "repeat_pattern"],
  WALL_TILE: ["installed", "sample", "repeat_pattern"],
};

export function getImageScenePresetsForCategory(category?: string | null) {
  if (!category) {
    return [] as const;
  }

  return imageScenePresetOptionsByCategory[category as SkuCategory] ?? ([] as const);
}

export const colorOptions = [
  "SKU Default",
  // 8 Standard concrete colors (Benjamin Moore reference)
  "Linen",          // BM White Opulance OC-69 — warm off-white
  "Frost",          // BM Silver Dollar 1460 — cool light gray
  "Beach",          // BM Gray Huskie 1473 — warm mid-gray
  "Graphite",       // BM Sterling Silver 1461 — cool mid-gray
  "Pewter",         // BM Graystone 1475 — warm medium gray
  "Storm",          // BM Eagle Rock 1469 — cool dark gray
  "Shadow",         // BM Kendall Charcoal HC-166 — dark charcoal
  "Carbon",         // BM Graphite 1603 — near-black
  // Woodform colors (wood-grain textured GFRC)
  "Mist",           // Light whitewashed wood tone
  "Dune",           // Warm natural blonde wood tone
  "Fog",            // Cool gray wood tone
  "Forest",         // Warm honey/amber wood tone
  "Grove",          // Medium warm brown wood tone
  "Twilight",       // Cool medium brown wood tone
  "Mocha",          // Deep rich brown wood tone
  "Ember",          // Near-black charred wood tone
  // Legacy / custom
  "Natural Gray",
  "Custom (specify in notes)",
] as const;

export const finishOptions = [
  "SKU Default",
  "Classic",        // Smooth, uniform, fine sand particles — all surfaces including sink basins
  "Foundry",        // Naturally mottled, hand-troweled — NOT for sink basins
  "Industrial",     // Raw, distressed, visible air pores — vertical surfaces only
  "Woodform",       // Wood-grain texture cast from real walnut slab molds — indoor/outdoor
] as const;

export const sealerOptions = [
  "SKU Default",
  "Matte",
  "Satin",
  "Gloss",
  "Natural (no sealer)",
] as const;

export const generatorFormSchema = z.object({
  skuCode: z.string().min(1, "SKU is required."),
  outputType: outputTypeSchema,
  scenePreset: imageScenePresetSchema.optional(),
  colorOverride: z.string().optional(),
  finishOverride: z.string().optional(),
  sealerOverride: z.string().optional(),
  requestedOutput: z.string().trim().min(2, "Requested output should be a little more specific."),
  creativeDirection: z.string().trim().min(2, "Creative direction should include a little context."),
}).superRefine((value, ctx) => {
  if (value.outputType === "IMAGE_RENDER" && !value.scenePreset) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Scene preset is required for IMAGE_RENDER output.",
      path: ["scenePreset"],
    });
  }
});

export type GeneratorFormValues = z.infer<typeof generatorFormSchema>;
export type ImageScenePreset = z.infer<typeof imageScenePresetSchema>;
