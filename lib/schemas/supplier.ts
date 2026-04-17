import { z } from "zod";
import { recordStatusSchema } from "./domain";

export const supplierAdminSchema = z.object({
  code: z.string().min(2, "Code is required."),
  name: z.string().min(2, "Name is required."),
  website: z.string(),
  contactEmail: z.string(),
  contactPhone: z.string(),
  notes: z.string(),
  status: recordStatusSchema,
});

export type SupplierAdminValues = z.infer<typeof supplierAdminSchema>;
