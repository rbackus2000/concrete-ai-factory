import { z } from "zod";
import { recordStatusSchema } from "./domain";

export const finishAdminSchema = z.object({
  code: z.string().min(1, "Code is required."),
  name: z.string().min(2, "Name is required."),
  colorFamily: z.string().optional().default(""),
  textureType: z.string().optional().default(""),
  sealerType: z.string().optional().default(""),
  pigmentFormula: z.string().optional().default(""),
  referenceImageUrl: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  status: recordStatusSchema,
});

export type FinishAdminValues = z.infer<typeof finishAdminSchema>;
