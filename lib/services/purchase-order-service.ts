import { AuditAction, AuditEntityType, type POStatus } from "@prisma/client";

import type { ActionActor } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import type {
  PurchaseOrderFormValues,
  ReceiveShipmentValues,
} from "@/lib/schemas/inventory";

import { createAuditLog } from "./audit-service";
import { adjustStock } from "./inventory-service";

// ── PO Number Generation ────────────────────────────────────

async function generatePONumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.purchaseOrder.count();
  const seq = String(count + 1).padStart(4, "0");
  return `RB-PO-${year}-${seq}`;
}

// ── List POs ────────────────────────────────────────────────

export async function listPurchaseOrders(filters?: {
  status?: POStatus;
  search?: string;
}) {
  const where: Record<string, unknown> = {};

  if (filters?.status) where.status = filters.status;
  if (filters?.search) {
    const term = filters.search;
    where.OR = [
      { poNumber: { contains: term, mode: "insensitive" } },
      { vendor: { contains: term, mode: "insensitive" } },
    ];
  }

  return prisma.purchaseOrder.findMany({
    where,
    include: { _count: { select: { items: true } } },
    orderBy: { createdAt: "desc" },
  });
}

// ── Get Single PO ───────────────────────────────────────────

export async function getPurchaseOrder(id: string) {
  return prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      items: {
        include: { item: { select: { id: true, name: true, sku: true } } },
        orderBy: { createdAt: "asc" },
      },
      events: { orderBy: { createdAt: "desc" } },
    },
  });
}

// ── Create PO ───────────────────────────────────────────────

export async function createPurchaseOrder(
  values: PurchaseOrderFormValues,
  actor: ActionActor,
) {
  const poNumber = await generatePONumber();
  const subtotal = values.items.reduce((sum, i) => sum + i.lineTotal, 0);
  const total = subtotal + (values.tax || 0) + (values.shipping || 0);

  const po = await prisma.purchaseOrder.create({
    data: {
      poNumber,
      vendor: values.vendor,
      vendorContact: values.vendorContact || null,
      vendorEmail: values.vendorEmail || null,
      expectedDelivery: values.expectedDelivery ? new Date(values.expectedDelivery) : null,
      notes: values.notes || null,
      subtotal,
      tax: values.tax || 0,
      shipping: values.shipping || 0,
      total,
      createdBy: actor.id,
      items: {
        create: values.items.map((item) => ({
          itemId: item.itemId || null,
          name: item.name,
          sku: item.sku || null,
          unit: item.unit || null,
          qtyOrdered: item.qtyOrdered,
          unitCost: item.unitCost,
          lineTotal: item.lineTotal,
        })),
      },
      events: {
        create: {
          event: "CREATED",
          createdBy: actor.id,
          metadata: JSON.stringify({ actor: actor.displayName }),
        },
      },
    },
    include: { items: true },
  });

  // Update qtyOnOrder for each inventory item
  for (const item of po.items) {
    if (item.itemId) {
      await prisma.inventoryItem.update({
        where: { id: item.itemId },
        data: { qtyOnOrder: { increment: item.qtyOrdered } },
      });
    }
  }

  await createAuditLog({
    actor,
    entityType: AuditEntityType.PURCHASE_ORDER,
    entityId: po.id,
    action: AuditAction.CREATE,
    summary: `Created PO ${poNumber} for vendor ${values.vendor}.`,
  });

  return po;
}

// ── Update PO (draft only) ──────────────────────────────────

export async function updatePurchaseOrder(
  id: string,
  values: Partial<PurchaseOrderFormValues>,
  actor: ActionActor,
) {
  const existing = await prisma.purchaseOrder.findUnique({ where: { id } });
  if (!existing) throw new Error("PO not found");
  if (existing.status !== "DRAFT") throw new Error("Can only edit draft POs");

  const updated = await prisma.purchaseOrder.update({
    where: { id },
    data: {
      ...(values.vendor !== undefined ? { vendor: values.vendor } : {}),
      ...(values.vendorContact !== undefined ? { vendorContact: values.vendorContact || null } : {}),
      ...(values.vendorEmail !== undefined ? { vendorEmail: values.vendorEmail || null } : {}),
      ...(values.expectedDelivery !== undefined ? { expectedDelivery: values.expectedDelivery ? new Date(values.expectedDelivery) : null } : {}),
      ...(values.notes !== undefined ? { notes: values.notes || null } : {}),
      ...(values.tax !== undefined ? { tax: values.tax } : {}),
      ...(values.shipping !== undefined ? { shipping: values.shipping } : {}),
    },
  });

  await createAuditLog({
    actor,
    entityType: AuditEntityType.PURCHASE_ORDER,
    entityId: id,
    action: AuditAction.UPDATE,
    summary: `Updated PO ${updated.poNumber}.`,
  });

  return updated;
}

// ── Mark PO Sent ────────────────────────────────────────────

export async function markPOSent(id: string, actor: ActionActor) {
  const po = await prisma.purchaseOrder.update({
    where: { id },
    data: {
      status: "SENT",
      events: {
        create: {
          event: "SENT",
          createdBy: actor.id,
          metadata: JSON.stringify({ actor: actor.displayName }),
        },
      },
    },
  });

  await createAuditLog({
    actor,
    entityType: AuditEntityType.PURCHASE_ORDER,
    entityId: id,
    action: AuditAction.UPDATE,
    summary: `Marked PO ${po.poNumber} as sent.`,
  });

  return po;
}

// ── Receive Shipment ────────────────────────────────────────

export async function receiveShipment(
  poId: string,
  values: ReceiveShipmentValues,
  actor: ActionActor,
) {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: poId },
    include: { items: true },
  });
  if (!po) throw new Error("PO not found");
  if (po.status === "RECEIVED" || po.status === "CANCELLED") {
    throw new Error(`Cannot receive on a ${po.status.toLowerCase()} PO`);
  }

  for (const line of values.lines) {
    if (line.qtyReceiving <= 0) continue;

    const poItem = po.items.find((i) => i.id === line.poItemId);
    if (!poItem) continue;

    // Update PO item received qty
    await prisma.purchaseOrderItem.update({
      where: { id: line.poItemId },
      data: { qtyReceived: { increment: line.qtyReceiving } },
    });

    // Adjust inventory stock
    if (line.itemId) {
      await adjustStock(
        line.itemId,
        {
          qtyChange: line.qtyReceiving,
          reason: `Received shipment — PO ${po.poNumber}`,
          referenceType: "PO",
          referenceId: po.id,
          referenceNumber: po.poNumber,
        },
        actor,
      );

      // Decrement qtyOnOrder
      await prisma.inventoryItem.update({
        where: { id: line.itemId },
        data: { qtyOnOrder: { decrement: line.qtyReceiving } },
      });
    }
  }

  // Check if fully received
  const updatedItems = await prisma.purchaseOrderItem.findMany({
    where: { poId },
  });

  const allReceived = updatedItems.every((i) => i.qtyReceived >= i.qtyOrdered);
  const anyReceived = updatedItems.some((i) => i.qtyReceived > 0);

  const newStatus = allReceived ? "RECEIVED" : anyReceived ? "PARTIALLY_RECEIVED" : po.status;

  await prisma.purchaseOrder.update({
    where: { id: poId },
    data: {
      status: newStatus,
      ...(allReceived ? { receivedAt: new Date() } : {}),
      events: {
        create: {
          event: allReceived ? "RECEIVED" : "PARTIALLY_RECEIVED",
          createdBy: actor.id,
          metadata: JSON.stringify({
            actor: actor.displayName,
            lines: values.lines.filter((l) => l.qtyReceiving > 0),
          }),
        },
      },
    },
  });

  await createAuditLog({
    actor,
    entityType: AuditEntityType.PURCHASE_ORDER,
    entityId: poId,
    action: AuditAction.UPDATE,
    summary: `Received shipment on PO ${po.poNumber}${allReceived ? " — fully received" : ""}.`,
  });

  return { status: newStatus, allReceived };
}

// ── Cancel PO ───────────────────────────────────────────────

export async function cancelPurchaseOrder(id: string, actor: ActionActor) {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!po) throw new Error("PO not found");
  if (po.status === "RECEIVED") throw new Error("Cannot cancel a received PO");

  // Reverse qtyOnOrder for unreceived quantities
  for (const item of po.items) {
    if (item.itemId) {
      const unreceived = item.qtyOrdered - item.qtyReceived;
      if (unreceived > 0) {
        await prisma.inventoryItem.update({
          where: { id: item.itemId },
          data: { qtyOnOrder: { decrement: unreceived } },
        });
      }
    }
  }

  await prisma.purchaseOrder.update({
    where: { id },
    data: {
      status: "CANCELLED",
      events: {
        create: {
          event: "CANCELLED",
          createdBy: actor.id,
          metadata: JSON.stringify({ actor: actor.displayName }),
        },
      },
    },
  });

  await createAuditLog({
    actor,
    entityType: AuditEntityType.PURCHASE_ORDER,
    entityId: id,
    action: AuditAction.ARCHIVE,
    summary: `Cancelled PO ${po.poNumber}.`,
  });
}

// ── PO Stats ────────────────────────────────────────────────

export async function getPOStats() {
  const all = await prisma.purchaseOrder.findMany({
    select: { status: true, total: true, expectedDelivery: true },
  });

  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 86400000);

  const openCount = all.filter((p) => ["DRAFT", "SENT", "PARTIALLY_RECEIVED"].includes(p.status)).length;
  const partialCount = all.filter((p) => p.status === "PARTIALLY_RECEIVED").length;
  const expectedThisWeek = all.filter(
    (p) => p.expectedDelivery && p.expectedDelivery <= weekFromNow && p.expectedDelivery >= now && p.status !== "RECEIVED" && p.status !== "CANCELLED",
  ).length;
  const totalOnOrder = all
    .filter((p) => ["DRAFT", "SENT", "PARTIALLY_RECEIVED"].includes(p.status))
    .reduce((sum, p) => sum + p.total, 0);

  return { openCount, partialCount, expectedThisWeek, totalOnOrder };
}

// ── PO Attention Count ──────────────────────────────────────

export async function getPOAttentionCount() {
  return prisma.purchaseOrder.count({
    where: { status: { in: ["DRAFT", "SENT", "PARTIALLY_RECEIVED"] } },
  });
}

// ── Create POs from Reorder Sheet ───────────────────────────

export async function createPOsFromReorderSheet(
  vendorOrders: Array<{
    vendor: string;
    items: Array<{ itemId: string; name: string; sku?: string; unit?: string; qty: number; unitCost: number }>;
  }>,
  actor: ActionActor,
) {
  const results: Array<{ poNumber: string; vendor: string }> = [];

  for (const order of vendorOrders) {
    const po = await createPurchaseOrder(
      {
        vendor: order.vendor,
        vendorContact: "",
        vendorEmail: "",
        expectedDelivery: "",
        notes: "Auto-generated from reorder report",
        tax: 0,
        shipping: 0,
        items: order.items.map((i) => ({
          itemId: i.itemId,
          name: i.name,
          sku: i.sku || "",
          unit: i.unit || "",
          qtyOrdered: i.qty,
          unitCost: i.unitCost,
          lineTotal: i.qty * i.unitCost,
        })),
      },
      actor,
    );
    results.push({ poNumber: po.poNumber, vendor: order.vendor });
  }

  return results;
}
