import { z } from "zod";
import { jobStatusSchema } from "./domain";

export const jobCreateSchema = z.object({
  skuCode: z.string().min(1, "SKU is required."),
  clientId: z.string().optional().default(""),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1."),
  dueDate: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  retailPriceTotal: z.coerce.number().nonnegative().optional().default(0),
  wholesalePriceTotal: z.coerce.number().nonnegative().optional().default(0),
});

export type JobCreateValues = z.infer<typeof jobCreateSchema>;

export const jobStatusTransitionSchema = z.object({
  jobId: z.string().min(1),
  nextStatus: jobStatusSchema,
});

export type JobStatusTransitionValues = z.infer<typeof jobStatusTransitionSchema>;
