import { z } from "zod";

// ── Enums ───────────────────────────────────────────────────

export const ORDER_STATUSES = [
  "PENDING",
  "IN_PRODUCTION",
  "QUALITY_CHECK",
  "READY_TO_SHIP",
  "LABEL_PURCHASED",
  "SHIPPED",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "EXCEPTION",
  "CANCELLED",
  "RETURNED",
] as const;
export type OrderStatusType = (typeof ORDER_STATUSES)[number];
export const orderStatusSchema = z.enum(ORDER_STATUSES);

export const ORDER_STATUS_LABELS: Record<OrderStatusType, string> = {
  PENDING: "Pending",
  IN_PRODUCTION: "In Production",
  QUALITY_CHECK: "Quality Check",
  READY_TO_SHIP: "Ready to Ship",
  LABEL_PURCHASED: "Label Purchased",
  SHIPPED: "Shipped",
  IN_TRANSIT: "In Transit",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  EXCEPTION: "Exception",
  CANCELLED: "Cancelled",
  RETURNED: "Returned",
};

export const PACKAGE_TYPES = ["Package", "Envelope", "Flat Rate Box"] as const;

export const RETURN_REASONS = [
  "Damaged in transit",
  "Wrong item shipped",
  "Customer changed mind",
  "Defective product",
  "Other",
] as const;

// ── Create Order (manual) ──────────────────────────────────

export const orderCreateSchema = z.object({
  invoiceId: z.string().optional(),
  quoteId: z.string().optional(),
  contactId: z.string().optional(),
  shipToName: z.string().optional().default(""),
  shipToCompany: z.string().optional().default(""),
  shipToAddress1: z.string().optional().default(""),
  shipToAddress2: z.string().optional().default(""),
  shipToCity: z.string().optional().default(""),
  shipToState: z.string().optional().default(""),
  shipToZip: z.string().optional().default(""),
  shipToCountry: z.string().optional().default("US"),
  shipByDate: z.string().optional(),
  productionNotes: z.string().optional().default(""),
  packingNotes: z.string().optional().default(""),
  lineItems: z.array(z.object({
    name: z.string().min(1),
    description: z.string().optional().default(""),
    imageUrl: z.string().optional().default(""),
    sku: z.string().optional().default(""),
    barcode: z.string().optional().default(""),
    quantity: z.number().int().min(1).default(1),
    unitPrice: z.number().min(0),
    lineTotal: z.number(),
    inventoryItemId: z.string().optional(),
    sortOrder: z.number().int().default(0),
  })).min(1),
  orderTotal: z.number(),
});

export type OrderCreateValues = z.infer<typeof orderCreateSchema>;

// ── Status Update ──────────────────────────────────────────

export const orderStatusUpdateSchema = z.object({
  status: orderStatusSchema,
  notes: z.string().optional(),
});

// ── Verify Line Item ───────────────────────────────────────

export const verifyLineItemSchema = z.object({
  lineItemId: z.string(),
  qtyScanned: z.number().int().min(1),
});

// ── Address ────────────────────────────────────────────────

export const addressVerifySchema = z.object({
  name: z.string().optional(),
  company: z.string().optional(),
  street1: z.string().min(1),
  street2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  zip: z.string().min(1),
  country: z.string().default("US"),
});

// ── Rate Shopping ──────────────────────────────────────────

export const getRatesSchema = z.object({
  toAddress: addressVerifySchema,
  parcel: z.object({
    weightOz: z.number().min(0.1),
    length: z.number().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
  }),
});

// ── Buy Label ──────────────────────────────────────────────

export const buyLabelSchema = z.object({
  rateId: z.string().min(1),
  easypostShipmentId: z.string().min(1),
  insure: z.boolean().default(false),
  declaredValue: z.number().optional(),
});

// ── Return ─────────────────────────────────────────────────

export const createReturnSchema = z.object({
  reason: z.string().min(1),
  notes: z.string().optional(),
});

// ── Bulk Actions ───────────────────────────────────────────

export const bulkActionSchema = z.object({
  orderIds: z.array(z.string()).min(1),
  action: z.enum(["PRINT_LABELS", "PRINT_PACKING_SLIPS", "MARK_IN_PRODUCTION", "MARK_READY_TO_SHIP"]),
});

// ── Filters ────────────────────────────────────────────────

export const orderFiltersSchema = z.object({
  status: orderStatusSchema.optional(),
  search: z.string().optional(),
});
