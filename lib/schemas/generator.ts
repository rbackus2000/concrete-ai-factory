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
  COUNTERTOP: [],
  FURNITURE: ["lifestyle", "catalog", "detail"],
  PANEL: ["installed", "sample", "repeat_pattern"],
};

export function getImageScenePresetsForCategory(category?: string | null) {
  if (!category) {
    return [] as const;
  }

  return imageScenePresetOptionsByCategory[category as SkuCategory] ?? ([] as const);
}

export const colorOptions = [
  "SKU Default",
  // Neutrals
  "Natural Gray",
  "Warm White",
  "Black",
  "Raw Concrete",
  // Signature pigment colors
  "Earth",
  "Smoke",
  "Coal",
  "Universe",
  "Slate",
  "Sand",
  "Wheat",
  "Moss",
  "Wine",
  "Chocolate",
  "Brick",
  "Ash",
  "Mushroom",
  "Sky",
  "Straw",
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
