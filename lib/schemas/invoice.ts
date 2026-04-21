import { z } from "zod";

// ── Enums ───────────────────────────────────────────────────

export const INVOICE_STATUSES = [
  "DRAFT", "SENT", "VIEWED", "PARTIAL", "PAID", "OVERDUE", "CANCELLED", "REFUNDED",
] as const;
export type InvoiceStatusType = (typeof INVOICE_STATUSES)[number];
export const invoiceStatusSchema = z.enum(INVOICE_STATUSES);

export const PAYMENT_METHODS = [
  "STRIPE_CARD", "STRIPE_ACH", "CASH", "CHECK", "WIRE", "OTHER",
] as const;
export type PaymentMethodType = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = [
  "PENDING", "SUCCEEDED", "FAILED", "REFUNDED",
] as const;

// ── Invoice Create (manual) ─────────────────────────────────

export const invoiceCreateSchema = z.object({
  contactId: z.string().optional(),
  contactName: z.string().min(1),
  contactEmail: z.string().email(),
  contactPhone: z.string().optional().default(""),
  companyName: z.string().optional().default(""),
  billingAddress: z.string().optional().default(""),
  customerNote: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  dueDate: z.string().min(1, "Due date is required"),
  depositPercent: z.number().min(0).max(100).nullable().optional(),
  taxRate: z.number().min(0).max(100).default(0),
  discountAmount: z.number().min(0).default(0),
  lineItems: z.array(z.object({
    name: z.string().min(1),
    description: z.string().optional().default(""),
    imageUrl: z.string().optional().default(""),
    quantity: z.number().int().min(1).default(1),
    unitPrice: z.number().min(0),
    discount: z.number().min(0).max(100).default(0),
    lineTotal: z.number(),
    skuId: z.string().optional(),
    sortOrder: z.number().int().default(0),
  })).min(1),
  subtotal: z.number(),
  taxAmount: z.number(),
  total: z.number(),
});

export type InvoiceCreateValues = z.infer<typeof invoiceCreateSchema>;

// ── Record Payment ──────────────────────────────────────────

export const recordPaymentSchema = z.object({
  amount: z.number().min(0.01, "Amount must be > 0"),
  method: z.enum(PAYMENT_METHODS),
  note: z.string().optional().default(""),
  paidAt: z.string().optional(),
});

export type RecordPaymentValues = z.infer<typeof recordPaymentSchema>;

// ── Reminder ────────────────────────────────────────────────

export const sendReminderSchema = z.object({
  type: z.enum(["MANUAL", "AUTO_3DAY", "AUTO_7DAY", "AUTO_OVERDUE"]).default("MANUAL"),
});

// ── Filters ─────────────────────────────────────────────────

export const invoiceFiltersSchema = z.object({
  status: invoiceStatusSchema.optional(),
  search: z.string().optional(),
});
