import { z } from "zod";

export const auditActionValues = [
  "CREATE",
  "UPDATE",
  "ARCHIVE",
  "EXPORT_MARKDOWN",
  "EXPORT_PDF",
  "VIEW_PRINT",
] as const;

export const auditEntityTypeValues = [
  "SKU",
  "PROMPT_TEMPLATE",
  "RULES_MASTER",
  "BUILD_PACKET_TEMPLATE",
  "QC_TEMPLATE",
  "MATERIALS_MASTER",
  "GENERATED_OUTPUT",
] as const;

export const auditLogFilterSchema = z.object({
  actorId: z.string().trim().optional().default(""),
  entityType: z.enum(auditEntityTypeValues).or(z.literal("")).optional().default(""),
  entityId: z.string().trim().optional().default(""),
  action: z.enum(auditActionValues).or(z.literal("")).optional().default(""),
});

export type AuditLogFilters = z.infer<typeof auditLogFilterSchema>;
