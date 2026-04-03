import { z } from "zod";

export const slatWallProjectStatusValues = ["DRAFT", "ACTIVE", "ARCHIVED"] as const;
export const slatWallProjectStatusSchema = z.enum(slatWallProjectStatusValues);
export type SlatWallProjectStatus = z.infer<typeof slatWallProjectStatusSchema>;

export const slatRecordStatusValues = ["PENDING", "PRINTED", "QC_PASSED", "INSTALLED"] as const;

export const slatWallProjectEditorSchema = z.object({
  name: z.string().min(2, "Project name is required."),
  code: z.string().min(2, "Project code is required.").regex(/^[A-Z0-9-]+$/, "Code must be uppercase letters, numbers, and dashes."),
  slug: z.string().min(2, "Slug is required."),
  status: slatWallProjectStatusSchema,
  clientName: z.string().optional(),
  location: z.string().optional(),
  designer: z.string().optional(),
  engineer: z.string().optional(),
  revision: z.string().optional(),
  description: z.string().optional(),
  positionAName: z.string().min(1, "Position A name is required."),
  positionBName: z.string().min(1, "Position B name is required."),
  // Config fields (inline with project for simple forms)
  totalSlatCount: z.coerce.number().int().min(2, "Minimum 2 slats.").max(100, "Maximum 100 slats."),
  slatWidth: z.coerce.number().min(1, "Minimum 1 inch.").max(24, "Maximum 24 inches."),
  slatThickness: z.coerce.number().min(0.1, "Minimum 0.1 inch.").max(2, "Maximum 2 inches."),
  slatHeight: z.coerce.number().min(12, "Minimum 12 inches.").max(360, "Maximum 30 feet."),
  slatSpacing: z.coerce.number().min(0).max(2, "Maximum 2 inch spacing."),
  supportFrameType: z.string().optional(),
  pivotType: z.string().optional(),
  rotationAngleA: z.coerce.number().min(0).max(360),
  rotationAngleB: z.coerce.number().min(0).max(360),
});

export type SlatWallProjectEditorValues = z.infer<typeof slatWallProjectEditorSchema>;
