import { z } from "zod";
import { recordStatusSchema } from "./domain";

export const colorCollectionAdminSchema = z.object({
  code: z.string().min(2, "Code is required."),
  name: z.string().min(2, "Name is required."),
  description: z.string(),
  sortOrder: z.coerce.number().int().min(0),
  status: recordStatusSchema,
});

export type ColorCollectionAdminValues = z.infer<typeof colorCollectionAdminSchema>;

export const productColorAdminSchema = z.object({
  collectionId: z.string().min(1, "Collection is required."),
  code: z.string().min(2, "Code is required."),
  name: z.string().min(2, "Name is required."),
  hexApprox: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color (#RRGGBB)."),
  pigmentFormula: z.string(),
  sortOrder: z.coerce.number().int().min(0),
  status: recordStatusSchema,
  notes: z.string(),
});

export type ProductColorAdminValues = z.infer<typeof productColorAdminSchema>;
