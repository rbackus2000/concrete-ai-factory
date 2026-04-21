import { OrderStatus, AuditEntityType, AuditAction, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/services/audit-service";
import type { ActionActor } from "@/lib/auth/session";
import type { OrderCreateValues, OrderStatusType } from "@/lib/schemas/order";

// ── Generate Order Number ───────────────────────────────────

async function generateOrderNumber(contactId: string | null): Promise<string> {
  const year = new Date().getFullYear();
  if (!contactId) {
    const count = await prisma.order.count({ where: { contactId: null } });
    return `RB-ORD-${year}-C0000-${String(count + 1).padStart(4, "0")}`;
  }
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    select: { clientNumber: true },
  });
  const clientNum = contact?.clientNumber ?? "C0000";
  const perClientCount = await prisma.order.count({ where: { contactId } });
  return `RB-ORD-${year}-${clientNum}-${String(perClientCount + 1).padStart(4, "0")}`;
}

// ── Generate Project Number ────────────────────────────────

async function generateProjectNumber(contactId: string | null): Promise<string> {
  const year = new Date().getFullYear();
  if (!contactId) {
    const count = await prisma.order.count({ where: { contactId: null, projectNumber: { not: null } } });
    return `RB-PRJ-${year}-C0000-${String(count + 1).padStart(4, "0")}`;
  }
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    select: { clientNumber: true },
  });
  const clientNum = contact?.clientNumber ?? "C0000";
  const perClientCount = await prisma.order.count({ where: { contactId, projectNumber: { not: null } } });
  return `RB-PRJ-${year}-${clientNum}-${String(perClientCount + 1).padStart(4, "0")}`;
}

// ── Generate Return Number ─────────────────────────────────

export async function generateReturnNumber(contactId: string | null): Promise<string> {
  const year = new Date().getFullYear();
  if (!contactId) {
    const count = await prisma.orderReturn.count({
      where: { order: { contactId: null } },
    });
    return `RB-RTN-${year}-C0000-${String(count + 1).padStart(4, "0")}`;
  }
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    select: { clientNumber: true },
  });
  const clientNum = contact?.clientNumber ?? "C0000";
  const perClientCount = await prisma.orderReturn.count({
    where: { order: { contactId } },
  });
  return `RB-RTN-${year}-${clientNum}-${String(perClientCount + 1).padStart(4, "0")}`;
}

// ── List Orders ─────────────────────────────────────────────

export async function listOrders(filters?: {
  status?: OrderStatusType;
  search?: string;
}) {
  const where: Prisma.OrderWhereInput = {};

  if (filters?.status) {
    where.status = filters.status as OrderStatus;
  }

  if (filters?.search) {
    const s = filters.search;
    where.OR = [
      { orderNumber: { contains: s, mode: "insensitive" } },
      { shipToName: { contains: s, mode: "insensitive" } },
      { shipToCompany: { contains: s, mode: "insensitive" } },
      { trackingNumber: { contains: s, mode: "insensitive" } },
      { lineItems: { some: { sku: { contains: s, mode: "insensitive" } } } },
    ];
  }

  return prisma.order.findMany({
    where,
    include: {
      contact: { select: { id: true, name: true, company: true, clientNumber: true } },
      invoice: { select: { id: true, invoiceNumber: true } },
      lineItems: { orderBy: { sortOrder: "asc" } },
      _count: { select: { lineItems: true, trackingEvents: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

// ── Get Order ───────────────────────────────────────────────

export async function getOrder(id: string) {
  return prisma.order.findUnique({
    where: { id },
    include: {
      contact: { select: { id: true, name: true, company: true, email: true, phone: true, clientNumber: true } },
      invoice: { select: { id: true, invoiceNumber: true, total: true } },
      quote: { select: { id: true, quoteNumber: true } },
      lineItems: { orderBy: { sortOrder: "asc" } },
      events: { orderBy: { createdAt: "desc" } },
      trackingEvents: { orderBy: { datetime: "asc" } },
      returns: { orderBy: { createdAt: "desc" } },
    },
  });
}

// ── Create Order ────────────────────────────────────────────

export async function createOrder(values: OrderCreateValues, actor: ActionActor) {
  const cid = values.contactId || null;
  const orderNumber = await generateOrderNumber(cid);
  const projectNumber = await generateProjectNumber(cid);

  const order = await prisma.order.create({
    data: {
      orderNumber,
      projectNumber,
      invoiceId: values.invoiceId || null,
      quoteId: values.quoteId || null,
      contactId: values.contactId || null,
      shipToName: values.shipToName || null,
      shipToCompany: values.shipToCompany || null,
      shipToAddress1: values.shipToAddress1 || null,
      shipToAddress2: values.shipToAddress2 || null,
      shipToCity: values.shipToCity || null,
      shipToState: values.shipToState || null,
      shipToZip: values.shipToZip || null,
      shipToCountry: values.shipToCountry || "US",
      shipByDate: values.shipByDate ? new Date(values.shipByDate) : null,
      productionNotes: values.productionNotes || null,
      packingNotes: values.packingNotes || null,
      orderTotal: values.orderTotal,
      createdBy: actor.id,
      lineItems: {
        create: values.lineItems.map((item, i) => ({
          name: item.name,
          description: item.description || null,
          imageUrl: item.imageUrl || null,
          sku: item.sku || null,
          barcode: item.barcode || null,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
          inventoryItemId: item.inventoryItemId || null,
          sortOrder: item.sortOrder ?? i,
        })),
      },
      events: {
        create: {
          event: "CREATED",
          metadata: JSON.stringify({ source: values.invoiceId ? "invoice" : "manual" }),
          createdBy: actor.id,
        },
      },
    },
    include: {
      lineItems: true,
    },
  });

  await createAuditLog({
    actor,
    entityType: AuditEntityType.ORDER,
    entityId: order.id,
    action: AuditAction.CREATE,
    summary: `Created order ${orderNumber}`,
  });

  // Log contact activity if contact linked
  if (order.contactId) {
    await prisma.contactActivity.create({
      data: {
        contactId: order.contactId,
        type: "ORDER_CREATED",
        content: `Order ${orderNumber} created`,
        createdBy: actor.id,
      },
    });
  }

  return order;
}

// ── Create Order from Invoice ───────────────────────────────

export async function createOrderFromInvoice(invoiceId: string, actor: ActionActor) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      lineItems: { orderBy: { sortOrder: "asc" } },
      contact: { select: { id: true, name: true, company: true, address: true, city: true, state: true, zip: true } },
    },
  });

  if (!invoice) throw new Error("Invoice not found");

  // Check if order already exists for this invoice
  const existing = await prisma.order.findUnique({ where: { invoiceId } });
  if (existing) return existing;

  // Try to find inventory items for line items
  const lineItems = await Promise.all(
    invoice.lineItems.map(async (item) => {
      let inventoryItemId: string | undefined;
      let barcode: string | undefined;
      if (item.skuId) {
        const inv = await prisma.inventoryItem.findFirst({
          where: { skuId: item.skuId, isActive: true },
          select: { id: true, barcode: true },
        });
        if (inv) {
          inventoryItemId = inv.id;
          barcode = inv.barcode ?? undefined;
        }
      }
      return {
        name: item.name,
        description: item.description || "",
        imageUrl: item.imageUrl || "",
        sku: "",
        barcode: barcode || "",
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
        inventoryItemId,
        sortOrder: item.sortOrder,
      };
    }),
  );

  return createOrder(
    {
      invoiceId: invoice.id,
      quoteId: invoice.quoteId ?? undefined,
      contactId: invoice.contactId ?? undefined,
      shipToName: invoice.contact?.name || invoice.contactName,
      shipToCompany: invoice.contact?.company || invoice.companyName || "",
      shipToAddress1: invoice.contact?.address || "",
      shipToAddress2: "",
      shipToCity: invoice.contact?.city || "",
      shipToState: invoice.contact?.state || "",
      shipToZip: invoice.contact?.zip || "",
      shipToCountry: "US",
      productionNotes: "",
      packingNotes: "",
      lineItems,
      orderTotal: invoice.total,
    },
    actor,
  );
}

// ── Update Order Status ─────────────────────────────────────

export async function updateOrderStatus(
  id: string,
  status: OrderStatusType,
  actor: ActionActor,
  notes?: string,
) {
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) throw new Error("Order not found");

  const oldStatus = order.status;
  const updateData: Prisma.OrderUpdateInput = { status: status as OrderStatus };

  // Status-specific actions
  if (status === "SHIPPED" && !order.shippedAt) {
    updateData.shippedAt = new Date();
  }
  if (status === "DELIVERED" && !order.deliveredAt) {
    updateData.deliveredAt = new Date();
  }

  const updated = await prisma.order.update({
    where: { id },
    data: updateData,
  });

  // Create event
  await prisma.orderEvent.create({
    data: {
      orderId: id,
      event: "STATUS_CHANGED",
      metadata: JSON.stringify({ from: oldStatus, to: status, notes }),
      createdBy: actor.id,
    },
  });

  // Contact activity for key status changes
  if (order.contactId) {
    if (status === "SHIPPED") {
      await prisma.contactActivity.create({
        data: {
          contactId: order.contactId,
          type: "ORDER_SHIPPED",
          content: `Order ${order.orderNumber} shipped${order.trackingNumber ? ` — tracking: ${order.trackingNumber}` : ""}`,
          createdBy: actor.id,
        },
      });
    }
    if (status === "DELIVERED") {
      await prisma.contactActivity.create({
        data: {
          contactId: order.contactId,
          type: "ORDER_DELIVERED",
          content: `Order ${order.orderNumber} delivered`,
          createdBy: actor.id,
        },
      });
    }
    if (status === "EXCEPTION") {
      await prisma.contactActivity.create({
        data: {
          contactId: order.contactId,
          type: "ORDER_EXCEPTION",
          content: `Shipping exception on order ${order.orderNumber}${notes ? `: ${notes}` : ""}`,
          createdBy: actor.id,
        },
      });
    }
  }

  // Inventory deduction when SHIPPED
  if (status === "SHIPPED") {
    await deductInventoryForOrder(id, order.orderNumber, actor);
  }

  // Release reservations when CANCELLED
  if (status === "CANCELLED") {
    await releaseReservationsForOrder(id, order.orderNumber, actor);
  }

  await createAuditLog({
    actor,
    entityType: AuditEntityType.ORDER,
    entityId: id,
    action: AuditAction.UPDATE,
    summary: `Order ${order.orderNumber} status changed ${oldStatus} → ${status}`,
  });

  return updated;
}

// ── Inventory Deduction on Ship ─────────────────────────────

async function deductInventoryForOrder(orderId: string, orderNumber: string, actor: ActionActor) {
  const lineItems = await prisma.orderLineItem.findMany({
    where: { orderId },
  });

  for (const item of lineItems) {
    if (!item.inventoryItemId) continue;

    const inv = await prisma.inventoryItem.findUnique({
      where: { id: item.inventoryItemId },
    });
    if (!inv) continue;

    const qtyBefore = inv.qtyOnHand;
    const qtyChange = -item.quantity;
    const qtyAfter = qtyBefore + qtyChange;
    const newReserved = Math.max(0, inv.qtyReserved - item.quantity);
    const newAvailable = qtyAfter - newReserved;
    const newTotalValue = qtyAfter * inv.costPerUnit;
    const isLowStock = qtyAfter <= inv.reorderPoint;

    await prisma.inventoryItem.update({
      where: { id: item.inventoryItemId },
      data: {
        qtyOnHand: qtyAfter,
        qtyReserved: newReserved,
        qtyAvailable: newAvailable,
        totalValue: newTotalValue,
        isLowStock,
      },
    });

    await prisma.stockMovement.create({
      data: {
        itemId: item.inventoryItemId,
        type: "OUT",
        qtyChange,
        qtyBefore,
        qtyAfter,
        reason: `Shipped — Order #${orderNumber}`,
        referenceType: "ORDER",
        referenceId: orderId,
        referenceNumber: orderNumber,
        createdBy: actor.id,
      },
    });
  }
}

// ── Release Reservations on Cancel ──────────────────────────

async function releaseReservationsForOrder(orderId: string, orderNumber: string, actor: ActionActor) {
  const lineItems = await prisma.orderLineItem.findMany({
    where: { orderId },
  });

  for (const item of lineItems) {
    if (!item.inventoryItemId) continue;

    const inv = await prisma.inventoryItem.findUnique({
      where: { id: item.inventoryItemId },
    });
    if (!inv) continue;

    const newReserved = Math.max(0, inv.qtyReserved - item.quantity);
    const newAvailable = inv.qtyOnHand - newReserved;

    await prisma.inventoryItem.update({
      where: { id: item.inventoryItemId },
      data: {
        qtyReserved: newReserved,
        qtyAvailable: newAvailable,
      },
    });

    await prisma.stockMovement.create({
      data: {
        itemId: item.inventoryItemId,
        type: "ADJUSTMENT",
        qtyChange: 0,
        qtyBefore: inv.qtyOnHand,
        qtyAfter: inv.qtyOnHand,
        reason: `Reservation released — Order #${orderNumber} cancelled`,
        referenceType: "ORDER",
        referenceId: orderId,
        referenceNumber: orderNumber,
        createdBy: actor.id,
      },
    });
  }
}

// ── Update Shipping Info ────────────────────────────────────

export async function updateOrderShipping(
  id: string,
  data: {
    carrier?: string;
    serviceLevel?: string;
    shippingRate?: number;
    trackingNumber?: string;
    labelUrl?: string;
    easypostShipmentId?: string;
    easypostTrackerId?: string;
    insuranceAmount?: number;
    insured?: boolean;
    shippingCost?: number;
  },
) {
  return prisma.order.update({
    where: { id },
    data,
  });
}

// ── Update Order Address ────────────────────────────────────

export async function updateOrderAddress(
  id: string,
  address: {
    shipToName?: string;
    shipToCompany?: string;
    shipToAddress1?: string;
    shipToAddress2?: string;
    shipToCity?: string;
    shipToState?: string;
    shipToZip?: string;
    shipToCountry?: string;
    addressVerified?: boolean;
  },
) {
  return prisma.order.update({ where: { id }, data: address });
}

// ── Update Package Details ──────────────────────────────────

export async function updateOrderPackage(
  id: string,
  data: {
    weightLbs?: number;
    weightOz?: number;
    dimLength?: number;
    dimWidth?: number;
    dimHeight?: number;
    packageType?: string;
  },
) {
  return prisma.order.update({ where: { id }, data });
}

// ── Update Production Notes ─────────────────────────────────

export async function updateOrderNotes(
  id: string,
  data: { productionNotes?: string; packingNotes?: string },
) {
  return prisma.order.update({ where: { id }, data });
}

// ── Verify Line Item ────────────────────────────────────────

export async function verifyLineItem(lineItemId: string, qtyScanned: number) {
  const item = await prisma.orderLineItem.findUnique({ where: { id: lineItemId } });
  if (!item) throw new Error("Line item not found");

  const newVerified = Math.min(item.qtyVerified + qtyScanned, item.quantity);
  const isVerified = newVerified >= item.quantity;

  return prisma.orderLineItem.update({
    where: { id: lineItemId },
    data: { qtyVerified: newVerified, isVerified },
  });
}

// ── Tracking Events ─────────────────────────────────────────

export async function addTrackingEvent(
  orderId: string,
  event: {
    status: string;
    message: string;
    location?: string;
    datetime: Date;
    source?: string;
  },
) {
  return prisma.trackingEvent.create({
    data: {
      orderId,
      ...event,
    },
  });
}

// ── Process EasyPost Tracking Update ────────────────────────

export async function processTrackingUpdate(
  trackerId: string,
  trackingStatus: string,
  details: Array<{
    status: string;
    message: string;
    datetime: string;
    tracking_location?: { city?: string; state?: string };
    source?: string;
  }>,
  estDeliveryDate?: string,
) {
  const order = await prisma.order.findFirst({
    where: { easypostTrackerId: trackerId },
  });
  if (!order) return null;

  // Add new tracking events
  for (const detail of details) {
    const existing = await prisma.trackingEvent.findFirst({
      where: {
        orderId: order.id,
        datetime: new Date(detail.datetime),
        status: detail.status,
      },
    });
    if (existing) continue;

    const location = detail.tracking_location
      ? [detail.tracking_location.city, detail.tracking_location.state].filter(Boolean).join(", ")
      : null;

    await prisma.trackingEvent.create({
      data: {
        orderId: order.id,
        status: detail.status,
        message: detail.message,
        location,
        datetime: new Date(detail.datetime),
        source: detail.source || null,
      },
    });
  }

  // Map EasyPost status to OrderStatus
  const statusMap: Record<string, OrderStatus> = {
    pre_transit: OrderStatus.LABEL_PURCHASED,
    in_transit: OrderStatus.IN_TRANSIT,
    out_for_delivery: OrderStatus.OUT_FOR_DELIVERY,
    delivered: OrderStatus.DELIVERED,
    failure: OrderStatus.EXCEPTION,
    return_to_sender: OrderStatus.EXCEPTION,
  };

  const newStatus = statusMap[trackingStatus];
  const updateData: Prisma.OrderUpdateInput = {
    trackingStatus,
    lastTrackingUpdate: new Date(),
  };

  if (estDeliveryDate) {
    updateData.estimatedDelivery = new Date(estDeliveryDate);
  }

  if (newStatus && newStatus !== order.status) {
    updateData.status = newStatus;
    if (newStatus === OrderStatus.DELIVERED) {
      updateData.deliveredAt = new Date();
    }

    // Create event for status change
    await prisma.orderEvent.create({
      data: {
        orderId: order.id,
        event: "STATUS_CHANGED",
        metadata: JSON.stringify({ from: order.status, to: newStatus, source: "easypost_webhook" }),
      },
    });

    // Contact activity
    if (order.contactId) {
      if (newStatus === OrderStatus.DELIVERED) {
        await prisma.contactActivity.create({
          data: {
            contactId: order.contactId,
            type: "ORDER_DELIVERED",
            content: `Order ${order.orderNumber} delivered`,
          },
        });
      }
      if (newStatus === OrderStatus.EXCEPTION) {
        await prisma.contactActivity.create({
          data: {
            contactId: order.contactId,
            type: "ORDER_EXCEPTION",
            content: `Shipping exception on order ${order.orderNumber}`,
          },
        });
      }
    }
  }

  return prisma.order.update({
    where: { id: order.id },
    data: updateData,
  });
}

// ── Create Return ───────────────────────────────────────────

export async function createReturn(
  orderId: string,
  reason: string,
  notes?: string,
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { contactId: true },
  });
  const returnNumber = await generateReturnNumber(order?.contactId ?? null);

  const ret = await prisma.orderReturn.create({
    data: {
      returnNumber,
      orderId,
      reason,
      notes: notes || null,
    },
  });

  await prisma.orderEvent.create({
    data: {
      orderId,
      event: "RETURN_INITIATED",
      metadata: JSON.stringify({ reason, returnId: ret.id }),
    },
  });

  return ret;
}

// ── Counts for Dashboard ────────────────────────────────────

export async function getOrderCounts() {
  const [total, pending, inProduction, readyToShip, shipped, inTransit, delivered, exception] = await Promise.all([
    prisma.order.count({ where: { status: { notIn: ["CANCELLED"] } } }),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.order.count({ where: { status: "IN_PRODUCTION" } }),
    prisma.order.count({ where: { status: "READY_TO_SHIP" } }),
    prisma.order.count({ where: { status: { in: ["SHIPPED", "LABEL_PURCHASED"] } } }),
    prisma.order.count({ where: { status: "IN_TRANSIT" } }),
    prisma.order.count({ where: { status: "DELIVERED" } }),
    prisma.order.count({ where: { status: "EXCEPTION" } }),
  ]);

  return { total, pending, inProduction, readyToShip, shipped, inTransit, delivered, exception };
}

// ── Attention Count for Sidebar ─────────────────────────────

export async function getOrderAttentionCount() {
  const [exception, readyToShip] = await Promise.all([
    prisma.order.count({ where: { status: "EXCEPTION" } }),
    prisma.order.count({ where: { status: "READY_TO_SHIP" } }),
  ]);
  return exception + readyToShip;
}

// ── Status Counts for Tabs ──────────────────────────────────

export async function getOrderStatusCounts() {
  const statuses: OrderStatusType[] = [
    "PENDING", "IN_PRODUCTION", "QUALITY_CHECK", "READY_TO_SHIP",
    "LABEL_PURCHASED", "SHIPPED", "IN_TRANSIT", "OUT_FOR_DELIVERY",
    "DELIVERED", "EXCEPTION", "CANCELLED", "RETURNED",
  ];

  const counts = await Promise.all(
    statuses.map((status) =>
      prisma.order.count({ where: { status } }).then((count) => ({ status, count })),
    ),
  );

  const all = await prisma.order.count();
  return { all, ...Object.fromEntries(counts.map((c) => [c.status, c.count])) } as Record<string, number>;
}

// ── Orders for Contact ──────────────────────────────────────

export async function getOrdersForContact(contactId: string) {
  return prisma.order.findMany({
    where: { contactId },
    include: {
      _count: { select: { lineItems: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

// ── Exception count for pipeline badge ──────────────────────

export async function getExceptionOrderContactIds() {
  const orders = await prisma.order.findMany({
    where: { status: "EXCEPTION", contactId: { not: null } },
    select: { contactId: true },
  });
  return orders.map((o) => o.contactId).filter(Boolean) as string[];
}
