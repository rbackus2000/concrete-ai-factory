import { z } from "zod";

export const clientAdminSchema = z.object({
  name: z.string().min(2, "Name is required."),
  company: z.string().optional().default(""),
  email: z.string().email("Invalid email.").optional().or(z.literal("")),
  phone: z.string().optional().default(""),
  address: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});

export type ClientAdminValues = z.infer<typeof clientAdminSchema>;
