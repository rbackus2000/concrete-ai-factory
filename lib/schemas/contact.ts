import { z } from "zod";

// ── Enums ───────────────────────────────────────────────────

export const LEAD_STAGES = [
  "NEW",
  "CONTACTED",
  "QUOTED",
  "NEGOTIATING",
  "WON",
  "LOST",
] as const;

export type LeadStageType = (typeof LEAD_STAGES)[number];

export const leadStageSchema = z.enum(LEAD_STAGES);

export const ACTIVITY_TYPES = [
  "NOTE",
  "CALL",
  "EMAIL",
  "QUOTE_CREATED",
  "QUOTE_SENT",
  "QUOTE_VIEWED",
  "QUOTE_SIGNED",
  "QUOTE_CONVERTED",
  "STAGE_CHANGED",
  "INVOICE_CREATED",
  "INVOICE_SENT",
  "INVOICE_PAID",
  "INVOICE_OVERDUE",
  "PAYMENT_RECEIVED",
] as const;

export type ActivityTypeValue = (typeof ACTIVITY_TYPES)[number];

export const activityTypeSchema = z.enum(ACTIVITY_TYPES);

export const LEAD_SOURCES = [
  "Website",
  "Referral",
  "Instagram",
  "Facebook",
  "Trade Show",
  "Cold Outreach",
  "Walk-in",
  "Other",
] as const;

export type LeadSource = (typeof LEAD_SOURCES)[number];

// ── Contact Form ────────────────────────────────────────────

export const contactFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional().default(""),
  company: z.string().optional().default(""),
  title: z.string().optional().default(""),
  address: z.string().optional().default(""),
  city: z.string().optional().default(""),
  state: z.string().optional().default(""),
  zip: z.string().optional().default(""),
  source: z.string().optional().default(""),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional().default(""),
  stage: leadStageSchema.default("NEW"),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;

// ── Activity Form ───────────────────────────────────────────

export const activityFormSchema = z.object({
  type: z.enum(["NOTE", "CALL"]),
  content: z.string().min(1, "Content is required"),
});

export type ActivityFormValues = z.infer<typeof activityFormSchema>;

// ── Stage Update ────────────────────────────────────────────

export const stageUpdateSchema = z.object({
  stage: leadStageSchema,
});

// ── Filters ─────────────────────────────────────────────────

export const contactFiltersSchema = z.object({
  search: z.string().optional(),
  stage: leadStageSchema.optional(),
  tag: z.string().optional(),
  sort: z.enum(["name", "totalQuoted", "lastActivity", "createdAt"]).optional(),
});
