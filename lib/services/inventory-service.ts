import { AuditAction, AuditEntityType, type InventoryType } from "@prisma/client";

import type { ActionActor } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import type {
  InventoryItemFormValues,
  StockAdjustmentValues,
} from "@/lib/schemas/inventory";

import { createAuditLog } from "./audit-service";

// ── Helpers ─────────────────────────────────────────────────

function recalcFields(item: { qtyOnHand: number; qtyReserved: number; costPerUnit: number; reorderPoint: number }) {
  return {
    qtyAvailable: item.qtyOnHand - item.qtyReserved,
    totalValue: item.qtyOnHand * item.costPerUnit,
    isLowStock: item.qtyOnHand <= item.reorderPoint && item.reorderPoint > 0,
  };
}

async function generateBarcode(): Promise<string> {
  const count = await prisma.inventoryItem.count();
  const seq = String(count + 1).padStart(5, "0");
  return `RB-${seq}`;
}

// ── List Items ──────────────────────────────────────────────

export async function listInventoryItems(filters?: {
  type?: InventoryType;
  search?: string;
  status?: string;
  category?: string;
}) {
  const where: Record<string, unknown> = { isActive: true };

  if (filters?.type) where.type = filters.type;
  if (filters?.category) where.category = filters.category;
  if (filters?.status === "low_stock") where.isLowStock = true;

  if (filters?.search) {
    const term = filters.search;
    where.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { sku: { contains: term, mode: "insensitive" } },
      { barcode: { contains: term, mode: "insensitive" } },
      { vendor: { contains: term, mode: "insensitive" } },
      { category: { contains: term, mode: "insensitive" } },
    ];
  }

  return prisma.inventoryItem.findMany({
    where,
    orderBy: { name: "asc" },
  });
}

// ── Get Single Item ─────────────────────────────────────────

export async function getInventoryItem(id: string) {
  return prisma.inventoryItem.findUnique({
    where: { id },
    include: {
      movements: { orderBy: { createdAt: "desc" }, take: 25 },
      purchaseOrderItems: {
        where: { po: { status: { in: ["DRAFT", "SENT", "PARTIALLY_RECEIVED"] } } },
        include: { po: { select: { id: true, poNumber: true, status: true } } },
      },
    },
  });
}

// ── Get by Barcode ──────────────────────────────────────────

export async function getInventoryItemByBarcode(barcode: string) {
  return prisma.inventoryItem.findFirst({
    where: {
      OR: [
        { barcode },
        { sku: barcode },
        { id: barcode },
      ],
      isActive: true,
    },
  });
}

// ── Create Item ─────────────────────────────────────────────

export async function createInventoryItem(
  values: InventoryItemFormValues,
  actor: ActionActor,
) {
  // Always auto-assign a barcode — use SKU if provided, otherwise generate
  const barcode = values.sku || await generateBarcode();
  const computed = recalcFields({
    qtyOnHand: values.qtyOnHand,
    qtyReserved: 0,
    costPerUnit: values.costPerUnit,
    reorderPoint: values.reorderPoint,
  });

  const item = await prisma.inventoryItem.create({
    data: {
      type: values.type,
      name: values.name,
      sku: values.sku || null,
      barcode,
      description: values.description || null,
      category: values.category || null,
      imageUrl: values.imageUrl || null,
      skuId: values.skuId || null,
      unit: values.unit || null,
      vendor: values.vendor || null,
      vendorSku: values.vendorSku || null,
      costPerUnit: values.costPerUnit,
      qtyOnHand: values.qtyOnHand,
      reorderPoint: values.reorderPoint,
      reorderQty: values.reorderQty,
      ...computed,
    },
  });

  // If initial qty > 0, create opening movement
  if (values.qtyOnHand > 0) {
    await prisma.stockMovement.create({
      data: {
        itemId: item.id,
        type: "IN",
        qtyChange: values.qtyOnHand,
        qtyBefore: 0,
        qtyAfter: values.qtyOnHand,
        reason: "Opening balance",
        createdBy: actor.id,
      },
    });
  }

  await createAuditLog({
    actor,
    entityType: AuditEntityType.INVENTORY_ITEM,
    entityId: item.id,
    action: AuditAction.CREATE,
    summary: `Created inventory item ${values.name}${values.sku ? ` (${values.sku})` : ""}.`,
  });

  return item;
}

// ── Update Item ─────────────────────────────────────────────

export async function updateInventoryItem(
  id: string,
  values: Partial<InventoryItemFormValues>,
  actor: ActionActor,
) {
  const existing = await prisma.inventoryItem.findUnique({ where: { id } });
  if (!existing) throw new Error("Item not found");

  const updated = await prisma.inventoryItem.update({
    where: { id },
    data: {
      ...(values.name !== undefined ? { name: values.name } : {}),
      ...(values.sku !== undefined ? { sku: values.sku || null, barcode: values.sku || null } : {}),
      ...(values.description !== undefined ? { description: values.description || null } : {}),
      ...(values.category !== undefined ? { category: values.category || null } : {}),
      ...(values.imageUrl !== undefined ? { imageUrl: values.imageUrl || null } : {}),
      ...(values.skuId !== undefined ? { skuId: values.skuId || null } : {}),
      ...(values.unit !== undefined ? { unit: values.unit || null } : {}),
      ...(values.vendor !== undefined ? { vendor: values.vendor || null } : {}),
      ...(values.vendorSku !== undefined ? { vendorSku: values.vendorSku || null } : {}),
      ...(values.costPerUnit !== undefined ? { costPerUnit: values.costPerUnit } : {}),
      ...(values.reorderPoint !== undefined ? { reorderPoint: values.reorderPoint } : {}),
      ...(values.reorderQty !== undefined ? { reorderQty: values.reorderQty } : {}),
      ...recalcFields({
        qtyOnHand: existing.qtyOnHand,
        qtyReserved: existing.qtyReserved,
        costPerUnit: values.costPerUnit ?? existing.costPerUnit,
        reorderPoint: values.reorderPoint ?? existing.reorderPoint,
      }),
    },
  });

  await createAuditLog({
    actor,
    entityType: AuditEntityType.INVENTORY_ITEM,
    entityId: id,
    action: AuditAction.UPDATE,
    summary: `Updated inventory item ${updated.name}.`,
  });

  return updated;
}

// ── Soft Delete ─────────────────────────────────────────────

export async function deactivateInventoryItem(id: string, actor: ActionActor) {
  const item = await prisma.inventoryItem.update({
    where: { id },
    data: { isActive: false },
  });

  await createAuditLog({
    actor,
    entityType: AuditEntityType.INVENTORY_ITEM,
    entityId: id,
    action: AuditAction.ARCHIVE,
    summary: `Deactivated inventory item ${item.name}.`,
  });

  return item;
}

// ── Adjust Stock ────────────────────────────────────────────

export async function adjustStock(
  itemId: string,
  values: StockAdjustmentValues,
  actor: ActionActor,
) {
  const item = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
  if (!item) throw new Error("Item not found");

  const qtyBefore = item.qtyOnHand;
  const qtyAfter = qtyBefore + values.qtyChange;
  if (qtyAfter < 0) throw new Error("Stock cannot go below zero");

  const movementType = values.qtyChange > 0 ? "IN" : values.qtyChange < 0 ? "OUT" : "ADJUSTMENT";

  const movement = await prisma.stockMovement.create({
    data: {
      itemId,
      type: movementType,
      qtyChange: values.qtyChange,
      qtyBefore,
      qtyAfter,
      reason: values.reason,
      notes: values.notes || null,
      referenceType: values.referenceType || null,
      referenceId: values.referenceId || null,
      referenceNumber: values.referenceNumber || null,
      createdBy: actor.id,
    },
  });

  const computed = recalcFields({
    qtyOnHand: qtyAfter,
    qtyReserved: item.qtyReserved,
    costPerUnit: item.costPerUnit,
    reorderPoint: item.reorderPoint,
  });

  await prisma.inventoryItem.update({
    where: { id: itemId },
    data: { qtyOnHand: qtyAfter, ...computed },
  });

  return { movement, qtyAfter, isLowStock: computed.isLowStock };
}

// ── Get Movements (paginated) ───────────────────────────────

export async function getMovements(itemId: string, page = 1, pageSize = 25) {
  const [movements, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where: { itemId },
      orderBy: { createdAt: "desc" },
      take: pageSize,
      skip: (page - 1) * pageSize,
    }),
    prisma.stockMovement.count({ where: { itemId } }),
  ]);
  return { movements, total, page, pageSize };
}

// ── Low Stock Items ─────────────────────────────────────────

export async function getLowStockItems() {
  return prisma.inventoryItem.findMany({
    where: { isLowStock: true, isActive: true },
    orderBy: { name: "asc" },
  });
}

// ── Reorder Sheet (grouped by vendor) ───────────────────────

export async function getReorderSheet() {
  const items = await prisma.inventoryItem.findMany({
    where: {
      isActive: true,
      type: "RAW_MATERIAL",
      isLowStock: true,
    },
    orderBy: [{ vendor: "asc" }, { name: "asc" }],
  });

  const grouped: Record<string, typeof items> = {};
  for (const item of items) {
    const vendor = item.vendor || "Unassigned";
    if (!grouped[vendor]) grouped[vendor] = [];
    grouped[vendor].push(item);
  }

  return grouped;
}

// ── Dashboard Stats ─────────────────────────────────────────

export async function getInventoryStats() {
  const items = await prisma.inventoryItem.findMany({
    where: { isActive: true },
    select: { type: true, totalValue: true, isLowStock: true, qtyOnOrder: true },
  });

  const totalItems = items.length;
  const totalValue = items.reduce((sum, i) => sum + i.totalValue, 0);
  const lowStockCount = items.filter((i) => i.isLowStock).length;
  const onOrderCount = items.filter((i) => i.qtyOnOrder > 0).length;
  const finishedValue = items.filter((i) => i.type === "FINISHED_PRODUCT").reduce((sum, i) => sum + i.totalValue, 0);
  const rawValue = items.filter((i) => i.type === "RAW_MATERIAL").reduce((sum, i) => sum + i.totalValue, 0);

  return { totalItems, totalValue, lowStockCount, onOrderCount, finishedValue, rawValue };
}

// ── Attention Count (for sidebar badge) ─────────────────────

export async function getInventoryAttentionCount() {
  return prisma.inventoryItem.count({
    where: { isLowStock: true, isActive: true },
  });
}

// ── Get All Categories ──────────────────────────────────────

export async function getInventoryCategories() {
  const items = await prisma.inventoryItem.findMany({
    where: { isActive: true, category: { not: null } },
    select: { category: true },
    distinct: ["category"],
  });
  return items.map((i) => i.category!).filter(Boolean).sort();
}

// ── Get All Vendors ─────────────────────────────────────────

export async function getInventoryVendors() {
  const items = await prisma.inventoryItem.findMany({
    where: { isActive: true, vendor: { not: null } },
    select: { vendor: true },
    distinct: ["vendor"],
  });
  return items.map((i) => i.vendor!).filter(Boolean).sort();
}

// ── CSV Export ───────────────────────────────────────────────

export async function getInventoryExportData() {
  return prisma.inventoryItem.findMany({
    where: { isActive: true },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
}

// ── Backfill Barcodes ───────────────────────────────────────

export async function backfillBarcodes() {
  const itemsWithout = await prisma.inventoryItem.findMany({
    where: { barcode: null, isActive: true },
    select: { id: true, sku: true },
  });

  let count = 0;
  for (const item of itemsWithout) {
    const barcode = item.sku || await generateBarcode();
    await prisma.inventoryItem.update({
      where: { id: item.id },
      data: { barcode },
    });
    count++;
  }

  return count;
}

// ── Get Items for Label Printing ────────────────────────────

export async function getItemsForLabels(ids?: string[]) {
  const where: Record<string, unknown> = { isActive: true };
  if (ids && ids.length > 0) {
    where.id = { in: ids };
  }

  return prisma.inventoryItem.findMany({
    where,
    select: {
      id: true,
      name: true,
      sku: true,
      barcode: true,
      type: true,
      category: true,
      qtyOnHand: true,
      unit: true,
    },
    orderBy: { name: "asc" },
  });
}

// ── Sync from MaterialsMaster + SKUs ────────────────────────

export async function syncInventoryFromMasters(actor: ActionActor) {
  let created = 0;
  let skipped = 0;

  // ── 1. Import MaterialsMaster as RAW_MATERIAL (deduplicate by name) ──
  // The same physical material (e.g. "AR glass fiber") can appear under
  // multiple codes for different SKU categories. For inventory we only
  // want one item per physical material, so we deduplicate by name.
  const materials = await prisma.materialsMaster.findMany({
    where: { status: "ACTIVE" },
    include: { supplier: { select: { name: true } } },
    orderBy: [
      { categoryScope: "asc" },
      { updatedAt: "desc" },
    ],
  });

  const seenNames = new Set<string>();
  for (const mat of materials) {
    if (seenNames.has(mat.name)) { continue; }
    seenNames.add(mat.name);

    // Skip if an inventory item with this name already exists
    const exists = await prisma.inventoryItem.findFirst({
      where: {
        OR: [{ name: mat.name }, { sku: mat.code }],
        isActive: true,
      },
    });
    if (exists) { skipped++; continue; }

    const barcode = await generateBarcode();
    const costPerUnit = mat.unitCost ? Number(mat.unitCost) : 0;

    await prisma.inventoryItem.create({
      data: {
        type: "RAW_MATERIAL",
        name: mat.name,
        sku: mat.code,
        barcode,
        description: mat.specification || null,
        category: mat.category,
        unit: mat.unit,
        vendor: mat.supplier?.name || null,
        vendorSku: mat.supplierSku || null,
        costPerUnit,
        qtyOnHand: 0,
        reorderPoint: 0,
        reorderQty: 0,
        qtyAvailable: 0,
        totalValue: 0,
        isLowStock: false,
      },
    });
    created++;
  }

  // ── 2. Import SKUs as FINISHED_PRODUCT ──
  const skus = await prisma.sku.findMany({
    where: { status: "ACTIVE" },
  });

  for (const sku of skus) {
    // Skip if an inventory item already references this SKU
    const exists = await prisma.inventoryItem.findFirst({
      where: {
        OR: [{ skuId: sku.id }, { sku: sku.code }],
        isActive: true,
      },
    });
    if (exists) { skipped++; continue; }

    const barcode = await generateBarcode();
    const costPerUnit = sku.retailPrice ? Number(sku.retailPrice) : 0;

    await prisma.inventoryItem.create({
      data: {
        type: "FINISHED_PRODUCT",
        name: sku.name,
        sku: sku.code,
        barcode,
        description: sku.description || null,
        category: sku.category,
        skuId: sku.id,
        costPerUnit,
        qtyOnHand: 0,
        reorderPoint: 0,
        reorderQty: 0,
        qtyAvailable: 0,
        totalValue: 0,
        isLowStock: false,
      },
    });
    created++;
  }

  await createAuditLog({
    actor,
    entityType: AuditEntityType.INVENTORY_ITEM,
    entityId: "sync",
    action: AuditAction.CREATE,
    summary: `Synced inventory from masters: ${created} created, ${skipped} skipped.`,
  });

  return { created, skipped };
}

// ── Deduct Stock on Invoice Paid ────────────────────────────

export async function deductStockForInvoice(
  invoiceId: string,
  invoiceNumber: string,
  lineItems: Array<{ skuId: string | null; quantity: number; name: string }>,
  actor: ActionActor,
) {
  for (const line of lineItems) {
    if (!line.skuId) continue;

    // Find inventory item linked to this SKU (by skuId or matching sku code)
    const invItem = await prisma.inventoryItem.findFirst({
      where: {
        isActive: true,
        OR: [
          { skuId: line.skuId },
          { sku: line.skuId },
        ],
      },
    });
    if (!invItem) continue;

    // Deduct stock
    await adjustStock(
      invItem.id,
      {
        qtyChange: -line.quantity,
        reason: `Sold — Invoice ${invoiceNumber}`,
        referenceType: "INVOICE",
        referenceId: invoiceId,
        referenceNumber: invoiceNumber,
      },
      actor,
    ).catch((err) => {
      console.error(`Failed to deduct stock for ${line.name} on invoice ${invoiceNumber}:`, err);
    });

    // Decrement reserved qty
    const newReserved = Math.max(0, invItem.qtyReserved - line.quantity);
    const newOnHand = Math.max(0, invItem.qtyOnHand - line.quantity);
    await prisma.inventoryItem.update({
      where: { id: invItem.id },
      data: {
        qtyReserved: newReserved,
        ...recalcFields({
          qtyOnHand: newOnHand,
          qtyReserved: newReserved,
          costPerUnit: invItem.costPerUnit,
          reorderPoint: invItem.reorderPoint,
        }),
      },
    });
  }
}

// ── Get Reserved Items for Contact ──────────────────────────

export async function getReservedItemsForContact(contactId: string) {
  // Find open/signed quotes for this contact, get their line items with SKU references
  const quotes = await prisma.quote.findMany({
    where: {
      contactId,
      status: { in: ["DRAFT", "SENT", "VIEWED", "SIGNED"] },
    },
    select: {
      id: true,
      quoteNumber: true,
      lineItems: {
        where: { skuId: { not: null } },
        select: { skuId: true, name: true, quantity: true },
      },
    },
  });

  const reserved: Array<{
    itemName: string;
    quantity: number;
    quoteNumber: string;
    quoteId: string;
  }> = [];

  for (const quote of quotes) {
    for (const line of quote.lineItems) {
      if (!line.skuId) continue;
      // Check if there's an inventory item for this
      const invItem = await prisma.inventoryItem.findFirst({
        where: {
          isActive: true,
          OR: [{ skuId: line.skuId }, { sku: line.skuId }],
        },
        select: { id: true, name: true },
      });
      if (invItem) {
        reserved.push({
          itemName: invItem.name,
          quantity: line.quantity,
          quoteNumber: quote.quoteNumber,
          quoteId: quote.id,
        });
      }
    }
  }

  return reserved;
}
