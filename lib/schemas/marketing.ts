import { z } from "zod";

// ── Sequence Triggers ────────────────────────────────────────

export const SEQUENCE_TRIGGERS = [
  "QUOTE_SENT",
  "QUOTE_VIEWED",
  "QUOTE_UNOPENED_3DAY",
  "QUOTE_VIEWED_UNSIGNED_2DAY",
  "INVOICE_SENT",
  "INVOICE_OVERDUE",
  "INVOICE_OVERDUE_7DAY",
  "INVOICE_OVERDUE_14DAY",
  "ORDER_DELIVERED",
  "NEW_CONTACT",
  "CONTACT_DORMANT_60DAY",
  "CONTACT_DORMANT_90DAY",
  "MANUAL",
] as const;

export const TRIGGER_LABELS: Record<string, string> = {
  QUOTE_SENT: "Quote Sent",
  QUOTE_VIEWED: "Quote Viewed",
  QUOTE_UNOPENED_3DAY: "Quote Unopened (3 days)",
  QUOTE_VIEWED_UNSIGNED_2DAY: "Quote Viewed but Unsigned (2 days)",
  INVOICE_SENT: "Invoice Sent",
  INVOICE_OVERDUE: "Invoice Overdue",
  INVOICE_OVERDUE_7DAY: "Invoice Overdue (7 days)",
  INVOICE_OVERDUE_14DAY: "Invoice Overdue (14 days)",
  ORDER_DELIVERED: "Order Delivered",
  NEW_CONTACT: "New Contact",
  CONTACT_DORMANT_60DAY: "Dormant Contact (60 days)",
  CONTACT_DORMANT_90DAY: "Dormant Contact (90 days)",
  MANUAL: "Manual Enrollment",
};

export const ENROLLMENT_STATUSES = ["ACTIVE", "PAUSED", "COMPLETED", "UNENROLLED"] as const;

export const CAMPAIGN_STATUSES = ["DRAFT", "SCHEDULED", "SENDING", "SENT", "CANCELLED"] as const;

export const EMAIL_TONES = ["friendly", "firm", "urgent", "celebratory"] as const;

export const SEGMENT_TYPES = ["ALL", "STAGE", "TAG", "HAS_OPEN_QUOTE", "HAS_OVERDUE_INVOICE", "CUSTOM"] as const;

// ── Schemas ────────────────────────────────────────────────

export const sequenceStepSchema = z.object({
  stepNumber: z.number().int().min(1),
  delayDays: z.number().int().min(0),
  subject: z.string().min(1),
  bodyHtml: z.string().min(1),
  tone: z.string().optional(),
});

export const createSequenceSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  trigger: z.enum(SEQUENCE_TRIGGERS),
  isActive: z.boolean().optional(),
  steps: z.array(sequenceStepSchema).min(1),
});

export const updateSequenceSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  trigger: z.enum(SEQUENCE_TRIGGERS).optional(),
  isActive: z.boolean().optional(),
  steps: z.array(sequenceStepSchema).optional(),
});

export const enrollContactSchema = z.object({
  contactId: z.string().min(1),
  triggerRefId: z.string().optional(),
  triggerType: z.string().optional(),
});

export const unenrollContactSchema = z.object({
  contactId: z.string().min(1),
  reason: z.string().optional(),
});

export const createCampaignSchema = z.object({
  name: z.string().min(1),
  subject: z.string().min(1),
  bodyHtml: z.string().min(1),
  segmentType: z.enum(SEGMENT_TYPES),
  segmentConfig: z.string().optional(),
});

export const updateCampaignSchema = z.object({
  name: z.string().min(1).optional(),
  subject: z.string().min(1).optional(),
  bodyHtml: z.string().min(1).optional(),
  segmentType: z.enum(SEGMENT_TYPES).optional(),
  segmentConfig: z.string().optional(),
});

export const sendCampaignSchema = z.object({
  sendNow: z.boolean(),
  scheduledAt: z.string().optional(),
});

export const generateEmailSchema = z.object({
  type: z.enum(["sequence_step", "campaign", "subject_improve"]),
  stepNumber: z.number().optional(),
  sequenceName: z.string().optional(),
  triggerEvent: z.string().optional(),
  contactName: z.string().optional(),
  delayDays: z.number().optional(),
  tone: z.string().optional(),
  previousSteps: z.array(z.string()).optional(),
  campaignName: z.string().optional(),
  segmentDescription: z.string().optional(),
  subject: z.string().optional(),
  context: z.string().optional(),
});
