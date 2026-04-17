import { z } from "zod";
import { recordStatusSchema } from "./domain";

export const laborRateAdminSchema = z.object({
  code: z.string().min(2, "Code is required."),
  name: z.string().min(2, "Name is required."),
  description: z.string(),
  hourlyRate: z.coerce.number().min(0, "Rate must be positive."),
  isDefault: z.coerce.boolean().default(false),
  status: recordStatusSchema,
});

export type LaborRateAdminValues = z.infer<typeof laborRateAdminSchema>;
