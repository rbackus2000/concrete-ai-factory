import { z } from "zod";

// ── Enums ───────────────────────────────────────────────────

export const INVENTORY_TYPES = ["FINISHED_PRODUCT", "RAW_MATERIAL"] as const;
export type InventoryTypeValue = (typeof INVENTORY_TYPES)[number];
export const inventoryTypeSchema = z.enum(INVENTORY_TYPES);

export const MOVEMENT_TYPES = ["IN", "OUT", "ADJUSTMENT"] as const;
export type MovementTypeValue = (typeof MOVEMENT_TYPES)[number];

export const INVENTORY_UNITS = [
  "ea",
  "lb",
  "oz",
  "g",
  "kg",
  "gal",
  "qt",
  "fl oz",
  "ft",
  "in",
  "mm",
  "sq ft",
  "bag",
  "box",
  "set",
  "kit",
  "tube",
  "cartridge",
  "roll",
  "sheet",
] as const;
export type InventoryUnit = (typeof INVENTORY_UNITS)[number];

export const MOVEMENT_REASONS = [
  "Received shipment",
  "Produced",
  "Production use",
  "Damaged / write-off",
  "Cycle count correction",
  "Return to vendor",
  "Sold — invoice deduction",
  "Manual adjustment",
  "Other",
] as const;

/** Reasons shown when adding stock to a FINISHED_PRODUCT */
export const ADD_REASONS_FINISHED = [
  "Produced",
  "Received shipment",
  "Cycle count correction",
  "Manual adjustment",
  "Other",
] as const;

/** Reasons shown when adding stock to a RAW_MATERIAL */
export const ADD_REASONS_RAW = [
  "Received shipment",
  "Cycle count correction",
  "Manual adjustment",
  "Other",
] as const;

/** Reasons shown when removing stock */
export const REMOVE_REASONS = [
  "Production use",
  "Damaged / write-off",
  "Return to vendor",
  "Sold — invoice deduction",
  "Cycle count correction",
  "Manual adjustment",
  "Other",
] as const;
export type MovementReason = (typeof MOVEMENT_REASONS)[number];

export const PO_STATUSES = [
  "DRAFT", "SENT", "PARTIALLY_RECEIVED", "RECEIVED", "CANCELLED",
] as const;
export type POStatusType = (typeof PO_STATUSES)[number];
export const poStatusSchema = z.enum(PO_STATUSES);

export const STOCK_COUNT_STATUSES = [
  "IN_PROGRESS", "COMMITTED", "CANCELLED",
] as const;
export type StockCountStatusType = (typeof STOCK_COUNT_STATUSES)[number];

// ── Inventory Item ──────────────────────────────────────────

export const inventoryItemFormSchema = z.object({
  type: inventoryTypeSchema,
  name: z.string().min(1, "Name is required"),
  sku: z.string().optional().default(""),
  description: z.string().optional().default(""),
  category: z.string().optional().default(""),
  imageUrl: z.string().optional().default(""),
  skuId: z.string().optional(),
  unit: z.string().optional().default(""),
  vendor: z.string().optional().default(""),
  vendorSku: z.string().optional().default(""),
  costPerUnit: z.number().min(0).default(0),
  qtyOnHand: z.number().min(0).default(0),
  reorderPoint: z.number().min(0).default(0),
  reorderQty: z.number().min(0).default(0),
});

export type InventoryItemFormValues = z.infer<typeof inventoryItemFormSchema>;

// ── Stock Adjustment ────────────────────────────────────────

export const stockAdjustmentSchema = z.object({
  qtyChange: z.number().refine((v) => v !== 0, "Qty change cannot be zero"),
  reason: z.string().min(1, "Reason is required"),
  notes: z.string().optional(),
  referenceType: z.string().optional(),
  referenceId: z.string().optional(),
  referenceNumber: z.string().optional(),
});

export type StockAdjustmentValues = z.infer<typeof stockAdjustmentSchema>;

// ── Purchase Order ──────────────────────────────────────────

export const purchaseOrderFormSchema = z.object({
  vendor: z.string().min(1, "Vendor is required"),
  vendorContact: z.string().optional().default(""),
  vendorEmail: z.string().optional().default(""),
  expectedDelivery: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  tax: z.number().min(0).default(0),
  shipping: z.number().min(0).default(0),
  items: z.array(z.object({
    itemId: z.string().optional(),
    name: z.string().min(1),
    sku: z.string().optional().default(""),
    unit: z.string().optional().default(""),
    qtyOrdered: z.number().min(0.01),
    unitCost: z.number().min(0),
    lineTotal: z.number(),
  })).min(1, "At least one item is required"),
});

export type PurchaseOrderFormValues = z.infer<typeof purchaseOrderFormSchema>;

// ── Receive Shipment ────────────────────────────────────────

export const receiveShipmentSchema = z.object({
  lines: z.array(z.object({
    poItemId: z.string(),
    itemId: z.string(),
    qtyReceiving: z.number().min(0),
  })),
});

export type ReceiveShipmentValues = z.infer<typeof receiveShipmentSchema>;

// ── Stock Count ─────────────────────────────────────────────

export const startCountSchema = z.object({
  scope: z.enum(["ALL", "FINISHED_PRODUCT", "RAW_MATERIAL", "CATEGORY"]).default("ALL"),
  category: z.string().optional(),
});

export type StartCountValues = z.infer<typeof startCountSchema>;

// ── Filters ─────────────────────────────────────────────────

export const inventoryFiltersSchema = z.object({
  type: inventoryTypeSchema.optional(),
  search: z.string().optional(),
  status: z.enum(["all", "low_stock", "active"]).optional(),
  category: z.string().optional(),
});
