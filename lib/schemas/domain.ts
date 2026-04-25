import { z } from "zod";

export const skuCategoryValues = ["VESSEL_SINK", "FURNITURE", "PANEL", "WALL_TILE", "HARD_GOOD"] as const;
export const categoryScopeValues = ["GLOBAL", "SKU_CATEGORY", "SKU_OVERRIDE"] as const;
export const recordStatusValues = ["DRAFT", "ACTIVE", "ARCHIVED"] as const;
export const outputStatusValues = [
  "QUEUED",
  "GENERATED",
  "APPROVED",
  "REJECTED",
  "FAILED",
] as const;
export const promptTemplateCategoryValues = [
  "IMAGE_PROMPT",
  "BLUEPRINT_PROMPT",
  "ALIGNMENT_PROMPT",
  "MOLD_BREAKDOWN_PROMPT",
  "DETAIL_SHEET_PROMPT",
  "BUILD_PACKET_SECTION",
] as const;
export const outputTypeValues = [
  "IMAGE_PROMPT",
  "IMAGE_RENDER",
  "BLUEPRINT_RENDER",
  "BLUEPRINT_PROMPT",
  "ALIGNMENT_PROMPT",
  "MOLD_BREAKDOWN_PROMPT",
  "DETAIL_SHEET_PROMPT",
  "BUILD_PACKET",
  "CALCULATION",
] as const;
export const materialCategoryValues = [
  "GFRC",
  "FACE_COAT",
  "BACKING_MIX",
  "PIGMENT",
  "REINFORCEMENT",
  "INSERT",
  "SEALER",
  "PACKAGING",
  "HARDWARE",
  "ADMIXTURE",
] as const;
export const ruleCategoryValues = [
  "DIMENSIONAL",
  "ALIGNMENT",
  "MOLD_SYSTEM",
  "PROCESS",
  "QC",
] as const;
export const qcCategoryValues = [
  "SETUP",
  "PRE_DEMOLD",
  "POST_DEMOLD",
  "ALIGNMENT",
] as const;
export const jobStatusValues = [
  "QUOTED",
  "IN_PRODUCTION",
  "QC",
  "READY",
  "SHIPPED",
  "DELIVERED",
] as const;
export const proposalStatusValues = [
  "DRAFT",
  "SENT",
  "VIEWED",
  "ACCEPTED",
  "REJECTED",
] as const;

export const skuCategorySchema = z.enum(skuCategoryValues);
export const categoryScopeSchema = z.enum(categoryScopeValues);
export const recordStatusSchema = z.enum(recordStatusValues);
export const outputStatusSchema = z.enum(outputStatusValues);
export const promptTemplateCategorySchema = z.enum(promptTemplateCategoryValues);
export const outputTypeSchema = z.enum(outputTypeValues);
export const materialCategorySchema = z.enum(materialCategoryValues);
export const ruleCategorySchema = z.enum(ruleCategoryValues);
export const qcCategorySchema = z.enum(qcCategoryValues);
export const jobStatusSchema = z.enum(jobStatusValues);
export const proposalStatusSchema = z.enum(proposalStatusValues);

export type SkuCategory = z.infer<typeof skuCategorySchema>;
export type CategoryScope = z.infer<typeof categoryScopeSchema>;
export type RecordStatus = z.infer<typeof recordStatusSchema>;
export type OutputStatus = z.infer<typeof outputStatusSchema>;
export type PromptTemplateCategory = z.infer<typeof promptTemplateCategorySchema>;
export type OutputType = z.infer<typeof outputTypeSchema>;
export type MaterialCategory = z.infer<typeof materialCategorySchema>;
export type RuleCategory = z.infer<typeof ruleCategorySchema>;
export type QcCategory = z.infer<typeof qcCategorySchema>;
export type JobStatus = z.infer<typeof jobStatusSchema>;
export type ProposalStatus = z.infer<typeof proposalStatusSchema>;
