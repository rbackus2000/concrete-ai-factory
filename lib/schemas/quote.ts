import { z } from "zod";

export const QUOTE_STATUSES = [
  "DRAFT",
  "SENT",
  "VIEWED",
  "SIGNED",
  "CONVERTED",
  "EXPIRED",
  "DECLINED",
] as const;

export type QuoteStatusType = (typeof QUOTE_STATUSES)[number];

export const quoteStatusSchema = z.enum(QUOTE_STATUSES);

// ── Line Item ────────────────────────────────────────────────

export const lineItemSchema = z.object({
  id: z.string().optional(),
  skuId: z.string().nullable().optional(),
  skuCode: z.string().nullable().optional(),
  name: z.string().min(1, "Name is required"),
  description: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  unitPrice: z.number().min(0, "Price must be >= 0"),
  quantity: z.number().int().min(1, "Quantity must be >= 1"),
  discount: z.number().min(0).max(100).default(0),
  lineTotal: z.number(),
  customerCanEditQty: z.boolean().default(false),
  customerCanRemove: z.boolean().default(false),
  isOptional: z.boolean().default(false),
  isSelected: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export type LineItemValues = z.infer<typeof lineItemSchema>;

// ── Quote Create / Update ────────────────────────────────────

export const PRICING_TIERS = ["RETAIL", "WHOLESALE"] as const;
export type PricingTier = (typeof PRICING_TIERS)[number];

export const quoteFormSchema = z.object({
  pricingTier: z.enum(PRICING_TIERS).default("RETAIL"),
  contactName: z.string().min(1, "Contact name is required"),
  contactEmail: z.string().email("Valid email is required"),
  contactPhone: z.string().optional().default(""),
  companyName: z.string().optional().default(""),
  customerMessage: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  terms: z.string().optional().default(""),
  validUntil: z.string().optional().default(""),
  lineItems: z.array(lineItemSchema).min(1, "At least one line item is required"),
  subtotal: z.number(),
  discountAmount: z.number().min(0).default(0),
  taxRate: z.number().min(0).max(100).default(0),
  taxAmount: z.number().default(0),
  total: z.number(),
});

export type QuoteFormValues = z.infer<typeof quoteFormSchema>;

// ── Sign Request ─────────────────────────────────────────────

export const signQuoteSchema = z.object({
  signerName: z.string().min(1, "Name is required"),
  signatureData: z.string().min(1, "Signature is required"),
  agreedToTerms: z.literal(true, {
    errorMap: () => ({ message: "You must agree to the terms" }),
  }),
  selectedItems: z.array(z.string()).optional(),
});

export type SignQuoteValues = z.infer<typeof signQuoteSchema>;

// ── Filters ──────────────────────────────────────────────────

export const quoteFiltersSchema = z.object({
  status: quoteStatusSchema.optional(),
  search: z.string().optional(),
});
