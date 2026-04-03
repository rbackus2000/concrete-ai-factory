import { z } from "zod";

import {
  categoryScopeSchema,
  materialCategorySchema,
  outputTypeSchema,
  promptTemplateCategorySchema,
  qcCategorySchema,
  recordStatusSchema,
  ruleCategorySchema,
  skuCategorySchema,
} from "./domain";

function isValidJson(value: string) {
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

function isValidStringArrayJson(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every((entry) => typeof entry === "string");
  } catch {
    return false;
  }
}

export const optionalSkuCategorySchema = z.union([skuCategorySchema, z.literal("")]);
export const optionalOutputTypeSchema = z.union([outputTypeSchema, z.literal("")]);

export const promptTemplateAdminSchema = z
  .object({
    key: z.string().min(2, "Key is required."),
    name: z.string().min(2, "Name is required."),
    category: promptTemplateCategorySchema,
    categoryScope: categoryScopeSchema,
    skuCategory: optionalSkuCategorySchema,
    skuOverrideId: z.string(),
    outputType: outputTypeSchema,
    status: recordStatusSchema,
    version: z.coerce.number().int().min(1),
    systemPrompt: z.string(),
    templateBody: z.string().min(10, "Template body is required."),
    variablesText: z
      .string()
      .refine((value) => isValidStringArrayJson(value), "Variables must be a JSON array of strings."),
    notes: z.string(),
  })
  .superRefine((value, ctx) => {
    if (value.categoryScope === "SKU_CATEGORY" && !value.skuCategory) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["skuCategory"],
        message: "SKU category is required for SKU_CATEGORY scope.",
      });
    }

    if (value.categoryScope === "SKU_OVERRIDE" && !value.skuOverrideId.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["skuOverrideId"],
        message: "SKU override is required for SKU_OVERRIDE scope.",
      });
    }
  });

export const rulesMasterAdminSchema = z
  .object({
    code: z.string().min(2, "Code is required."),
    title: z.string().min(2, "Title is required."),
    category: ruleCategorySchema,
    categoryScope: categoryScopeSchema,
    skuCategory: optionalSkuCategorySchema,
    skuOverrideId: z.string(),
    outputType: optionalOutputTypeSchema,
    status: recordStatusSchema,
    priority: z.coerce.number().int().min(1),
    description: z.string(),
    ruleText: z.string().min(10, "Rule text is required."),
    source: z.string(),
    metadataJson: z
      .string()
      .refine((value) => value.trim() === "" || isValidJson(value), "Metadata must be valid JSON."),
  })
  .superRefine((value, ctx) => {
    if (value.categoryScope === "SKU_CATEGORY" && !value.skuCategory) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["skuCategory"],
        message: "SKU category is required for SKU_CATEGORY scope.",
      });
    }

    if (value.categoryScope === "SKU_OVERRIDE" && !value.skuOverrideId.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["skuOverrideId"],
        message: "SKU override is required for SKU_OVERRIDE scope.",
      });
    }
  });

export const buildPacketTemplateAdminSchema = z
  .object({
    packetKey: z.string().min(2, "Packet key is required."),
    sectionKey: z.string().min(2, "Section key is required."),
    name: z.string().min(2, "Name is required."),
    sectionOrder: z.coerce.number().int().min(1),
    categoryScope: categoryScopeSchema,
    skuCategory: optionalSkuCategorySchema,
    skuOverrideId: z.string(),
    outputType: outputTypeSchema,
    status: recordStatusSchema,
    content: z.string().min(10, "Content is required."),
    variablesText: z
      .string()
      .refine((value) => isValidStringArrayJson(value), "Variables must be a JSON array of strings."),
  })
  .superRefine((value, ctx) => {
    if (value.categoryScope === "SKU_CATEGORY" && !value.skuCategory) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["skuCategory"],
        message: "SKU category is required for SKU_CATEGORY scope.",
      });
    }

    if (value.categoryScope === "SKU_OVERRIDE" && !value.skuOverrideId.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["skuOverrideId"],
        message: "SKU override is required for SKU_OVERRIDE scope.",
      });
    }
  });

export const qcTemplateAdminSchema = z
  .object({
    templateKey: z.string().min(2, "Template key is required."),
    name: z.string().min(2, "Name is required."),
    category: qcCategorySchema,
    categoryScope: categoryScopeSchema,
    skuCategory: optionalSkuCategorySchema,
    skuOverrideId: z.string(),
    status: recordStatusSchema,
    checklistText: z
      .string()
      .refine((value) => isValidStringArrayJson(value), "Checklist must be a JSON array of strings."),
    acceptanceCriteriaText: z
      .string()
      .refine((value) => isValidStringArrayJson(value), "Acceptance criteria must be a JSON array of strings."),
    rejectionCriteriaText: z
      .string()
      .refine((value) => isValidStringArrayJson(value), "Rejection criteria must be a JSON array of strings."),
    notes: z.string(),
  })
  .superRefine((value, ctx) => {
    if (value.categoryScope === "SKU_CATEGORY" && !value.skuCategory) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["skuCategory"],
        message: "SKU category is required for SKU_CATEGORY scope.",
      });
    }

    if (value.categoryScope === "SKU_OVERRIDE" && !value.skuOverrideId.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["skuOverrideId"],
        message: "SKU override is required for SKU_OVERRIDE scope.",
      });
    }
  });

export const materialsMasterAdminSchema = z
  .object({
    code: z.string().min(2, "Code is required."),
    name: z.string().min(2, "Name is required."),
    category: materialCategorySchema,
    categoryScope: categoryScopeSchema,
    skuCategory: optionalSkuCategorySchema,
    skuOverrideId: z.string(),
    status: recordStatusSchema,
    unit: z.string().min(1, "Unit is required."),
    quantity: z.coerce.number().min(0),
    unitCost: z.coerce.number().min(0),
    specification: z.string(),
    notes: z.string(),
    metadataJson: z
      .string()
      .refine((value) => value.trim() === "" || isValidJson(value), "Metadata must be valid JSON."),
  })
  .superRefine((value, ctx) => {
    if (value.categoryScope === "SKU_CATEGORY" && !value.skuCategory) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["skuCategory"],
        message: "SKU category is required for SKU_CATEGORY scope.",
      });
    }

    if (value.categoryScope === "SKU_OVERRIDE" && !value.skuOverrideId.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["skuOverrideId"],
        message: "SKU override is required for SKU_OVERRIDE scope.",
      });
    }
  });

export function parseOptionalString(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function parseOptionalJson(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? JSON.parse(trimmed) : null;
}

export function parseStringArrayJson(value: string) {
  return JSON.parse(value) as string[];
}

export type PromptTemplateAdminValues = z.infer<typeof promptTemplateAdminSchema>;
export type RulesMasterAdminValues = z.infer<typeof rulesMasterAdminSchema>;
export type BuildPacketTemplateAdminValues = z.infer<typeof buildPacketTemplateAdminSchema>;
export type QcTemplateAdminValues = z.infer<typeof qcTemplateAdminSchema>;
export type MaterialsMasterAdminValues = z.infer<typeof materialsMasterAdminSchema>;
