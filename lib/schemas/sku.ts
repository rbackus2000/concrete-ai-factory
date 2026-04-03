import { z } from "zod";

import { recordStatusSchema, skuCategorySchema } from "./domain";

export const datumSystemEntrySchema = z.object({
  name: z.string().min(1, "Datum name is required."),
  description: z.string().min(1, "Datum description is required."),
});

export const calculatorDefaultsSchema = z.object({
  batchSizeLbs: z.number(),
  mixType: z.string(),
  waterLbs: z.number(),
  plasticizerGrams: z.number(),
  fiberPercent: z.number(),
  colorIntensityPercent: z.number(),
  unitsToProduce: z.number(),
  weightPerUnitLbs: z.number(),
  wasteFactor: z.number(),
  autoBatchSizeLbs: z.number(),
  scaleFactor: z.number(),
  pigmentGrams: z.number(),
});

export const skuSchema = z.object({
  code: z.string(),
  name: z.string(),
  slug: z.string(),
  category: skuCategorySchema,
  status: recordStatusSchema,
  type: z.string(),
  finish: z.string(),
  summary: z.string(),
  targetWeight: z.object({
    min: z.number(),
    max: z.number(),
  }),
  outerLength: z.number(),
  outerWidth: z.number(),
  outerHeight: z.number(),
  innerLength: z.number(),
  innerWidth: z.number(),
  innerDepth: z.number(),
  wallThickness: z.number(),
  bottomThickness: z.number(),
  topLipThickness: z.number(),
  hollowCoreDepth: z.number(),
  domeRiseMin: z.number(),
  domeRiseMax: z.number(),
  longRibCount: z.number().int(),
  crossRibCount: z.number().int(),
  ribWidth: z.number(),
  ribHeight: z.number(),
  drainDiameter: z.number(),
  reinforcementDiameter: z.number(),
  reinforcementThickness: z.number(),
  draftAngle: z.number(),
  cornerRadius: z.number(),
  fiberPercent: z.number(),
  datumSystem: z.array(datumSystemEntrySchema),
  calculatorDefaults: calculatorDefaultsSchema,
});

function parseJsonString(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export const skuEditorSchema = z.object({
  name: z.string().min(2, "Name is required."),
  slug: z.string().min(2, "Slug is required."),
  category: skuCategorySchema,
  status: recordStatusSchema,
  type: z.string().min(2, "Type is required."),
  finish: z.string().min(2, "Finish is required."),
  summary: z.string().min(10, "Summary should be more descriptive."),
  targetWeightMin: z.coerce.number().nonnegative(),
  targetWeightMax: z.coerce.number().nonnegative(),
  outerLength: z.coerce.number().nonnegative(),
  outerWidth: z.coerce.number().nonnegative(),
  outerHeight: z.coerce.number().nonnegative(),
  innerLength: z.coerce.number().nonnegative(),
  innerWidth: z.coerce.number().nonnegative(),
  innerDepth: z.coerce.number().nonnegative(),
  wallThickness: z.coerce.number().nonnegative(),
  bottomThickness: z.coerce.number().nonnegative(),
  topLipThickness: z.coerce.number().nonnegative(),
  hollowCoreDepth: z.coerce.number().nonnegative(),
  domeRiseMin: z.coerce.number().nonnegative(),
  domeRiseMax: z.coerce.number().nonnegative(),
  longRibCount: z.coerce.number().int().nonnegative(),
  crossRibCount: z.coerce.number().int().nonnegative(),
  ribWidth: z.coerce.number().nonnegative(),
  ribHeight: z.coerce.number().nonnegative(),
  drainDiameter: z.coerce.number().nonnegative(),
  reinforcementDiameter: z.coerce.number().nonnegative(),
  reinforcementThickness: z.coerce.number().nonnegative(),
  draftAngle: z.coerce.number().nonnegative(),
  cornerRadius: z.coerce.number().nonnegative(),
  fiberPercent: z.coerce.number().min(0).max(1),
  datumSystemJson: z.string().refine((value) => {
    const parsed = parseJsonString(value);
    return !!datumSystemEntrySchema.array().safeParse(parsed).success;
  }, "Datum system JSON must be an array of { name, description } objects."),
  calculatorDefaultsJson: z.string().refine((value) => {
    const parsed = parseJsonString(value);
    return !!calculatorDefaultsSchema.safeParse(parsed).success;
  }, "Calculator defaults JSON must match the expected object shape."),
}).superRefine((value, ctx) => {
  if (value.targetWeightMax < value.targetWeightMin) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Max target weight must be greater than or equal to min target weight.",
      path: ["targetWeightMax"],
    });
  }

  if (value.innerLength > value.outerLength) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Inner length cannot exceed outer length.",
      path: ["innerLength"],
    });
  }

  if (value.innerWidth > value.outerWidth) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Inner width cannot exceed outer width.",
      path: ["innerWidth"],
    });
  }

  if (value.innerDepth > value.outerHeight) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Inner depth cannot exceed outer height.",
      path: ["innerDepth"],
    });
  }
});

export function parseDatumSystemJsonInput(value: string) {
  return datumSystemEntrySchema.array().parse(JSON.parse(value));
}

export function parseCalculatorDefaultsJsonInput(value: string) {
  return calculatorDefaultsSchema.parse(JSON.parse(value));
}

export type Sku = z.infer<typeof skuSchema>;
export type SkuEditorValues = z.infer<typeof skuEditorSchema>;
