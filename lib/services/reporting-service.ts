import { prisma } from "../db";

// ── Helpers ──────────────────────────────────────────────────

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function monthsAgo(n: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return startOfMonth(d);
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function fmtMonth(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

// ── KPIs ─────────────────────────────────────────────────────

export async function getDashboardKPIs() {
  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const lastMonthStart = monthsAgo(1);
  const lastMonthEnd = new Date(thisMonthStart.getTime() - 1);

  const [
    revenueThisMonth,
    revenueLastMonth,
    outstandingInvoices,
    overdueInvoices,
    activeOrders,
    readyToShipOrders,
    inventoryAgg,
    lowStockCount,
    openQuotes,
  ] = await Promise.all([
    // Revenue this month = sum of payments received this month
    prisma.payment.aggregate({
      where: { status: "SUCCEEDED", paidAt: { gte: thisMonthStart } },
      _sum: { amount: true },
    }),
    // Revenue last month
    prisma.payment.aggregate({
      where: { status: "SUCCEEDED", paidAt: { gte: lastMonthStart, lte: lastMonthEnd } },
      _sum: { amount: true },
    }),
    // Outstanding invoices (SENT, VIEWED, OVERDUE, PARTIAL)
    prisma.invoice.aggregate({
      where: { status: { in: ["SENT", "VIEWED", "OVERDUE", "PARTIAL"] } },
      _sum: { amountDue: true },
      _count: true,
    }),
    // Overdue invoices
    prisma.invoice.aggregate({
      where: { status: "OVERDUE" },
      _sum: { amountDue: true },
      _count: true,
    }),
    // Active orders (not DELIVERED/CANCELLED/RETURNED)
    prisma.order.count({
      where: { status: { notIn: ["DELIVERED", "CANCELLED", "RETURNED"] } },
    }),
    // Ready to ship
    prisma.order.count({
      where: { status: "READY_TO_SHIP" },
    }),
    // Inventory value
    prisma.inventoryItem.aggregate({
      where: { isActive: true },
      _sum: { totalValue: true },
    }),
    // Low stock count
    prisma.inventoryItem.count({
      where: { isActive: true, isLowStock: true },
    }),
    // Pipeline value (open quotes)
    prisma.quote.aggregate({
      where: { status: { in: ["SENT", "VIEWED"] } },
      _sum: { total: true },
      _count: true,
    }),
  ]);

  const r2 = (n: number) => Math.round(n * 100) / 100;

  return {
    revenueThisMonth: r2(revenueThisMonth._sum.amount ?? 0),
    revenueLastMonth: r2(revenueLastMonth._sum.amount ?? 0),
    outstanding: r2(outstandingInvoices._sum.amountDue ?? 0),
    outstandingCount: outstandingInvoices._count,
    overdue: r2(overdueInvoices._sum.amountDue ?? 0),
    overdueCount: overdueInvoices._count,
    activeOrders,
    readyToShipCount: readyToShipOrders,
    inventoryValue: r2(inventoryAgg._sum.totalValue ?? 0),
    lowStockCount,
    pipelineValue: r2(openQuotes._sum.total ?? 0),
    openQuoteCount: openQuotes._count,
  };
}

// ── Revenue Chart (P&L) ─────────────────────────────────────

export async function getRevenueChartData(period: string) {
  let monthCount = 12;
  if (period === "6m") monthCount = 6;

  const since = monthsAgo(monthCount);

  const [payments, stockOuts] = await Promise.all([
    prisma.payment.findMany({
      where: { status: "SUCCEEDED", paidAt: { gte: since } },
      select: { amount: true, paidAt: true },
    }),
    prisma.stockMovement.findMany({
      where: { type: "OUT", createdAt: { gte: since } },
      select: { qtyChange: true, createdAt: true, item: { select: { costPerUnit: true } } },
    }),
  ]);

  // Build monthly buckets
  const months: Array<{ month: string; date: Date; revenue: number; costs: number; net: number }> = [];
  for (let i = monthCount - 1; i >= 0; i--) {
    const d = monthsAgo(i);
    months.push({ month: fmtMonth(d), date: d, revenue: 0, costs: 0, net: 0 });
  }

  for (const p of payments) {
    if (!p.paidAt) continue;
    const key = fmtMonth(p.paidAt);
    const bucket = months.find((m) => m.month === key);
    if (bucket) bucket.revenue += p.amount;
  }

  for (const s of stockOuts) {
    const key = fmtMonth(s.createdAt);
    const bucket = months.find((m) => m.month === key);
    if (bucket) bucket.costs += Math.abs(s.qtyChange) * s.item.costPerUnit;
  }

  for (const m of months) {
    m.net = m.revenue - m.costs;
  }

  const totalRevenue = months.reduce((s, m) => s + m.revenue, 0);
  const totalCosts = months.reduce((s, m) => s + m.costs, 0);
  const totalNet = totalRevenue - totalCosts;
  const margin = totalRevenue > 0 ? (totalNet / totalRevenue) * 100 : 0;

  return {
    months: months.map(({ month, revenue, costs, net }) => ({ month, revenue: Math.round(revenue * 100) / 100, costs: Math.round(costs * 100) / 100, net: Math.round(net * 100) / 100 })),
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalCosts: Math.round(totalCosts * 100) / 100,
    totalNet: Math.round(totalNet * 100) / 100,
    margin: Math.round(margin * 10) / 10,
  };
}

// ── AR Aging ─────────────────────────────────────────────────

export async function getARAgingData() {
  const unpaidInvoices = await prisma.invoice.findMany({
    where: { status: { in: ["SENT", "VIEWED", "OVERDUE", "PARTIAL"] } },
    select: {
      id: true,
      invoiceNumber: true,
      contactName: true,
      amountDue: true,
      dueDate: true,
      publicToken: true,
    },
    orderBy: { dueDate: "asc" },
  });

  const now = new Date();
  const buckets = { current: { total: 0, count: 0 }, days1to30: { total: 0, count: 0 }, days31to60: { total: 0, count: 0 }, days60plus: { total: 0, count: 0 } };
  const overdueList: Array<{ id: string; invoiceNumber: string; contactName: string; amountDue: number; daysOverdue: number; publicToken: string }> = [];

  for (const inv of unpaidInvoices) {
    const diffMs = now.getTime() - new Date(inv.dueDate).getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      buckets.current.total += inv.amountDue;
      buckets.current.count++;
    } else if (diffDays <= 30) {
      buckets.days1to30.total += inv.amountDue;
      buckets.days1to30.count++;
      overdueList.push({ id: inv.id, invoiceNumber: inv.invoiceNumber, contactName: inv.contactName, amountDue: inv.amountDue, daysOverdue: diffDays, publicToken: inv.publicToken });
    } else if (diffDays <= 60) {
      buckets.days31to60.total += inv.amountDue;
      buckets.days31to60.count++;
      overdueList.push({ id: inv.id, invoiceNumber: inv.invoiceNumber, contactName: inv.contactName, amountDue: inv.amountDue, daysOverdue: diffDays, publicToken: inv.publicToken });
    } else {
      buckets.days60plus.total += inv.amountDue;
      buckets.days60plus.count++;
      overdueList.push({ id: inv.id, invoiceNumber: inv.invoiceNumber, contactName: inv.contactName, amountDue: inv.amountDue, daysOverdue: diffDays, publicToken: inv.publicToken });
    }
  }

  // Top 5 most overdue
  overdueList.sort((a, b) => b.daysOverdue - a.daysOverdue);

  return {
    buckets,
    topOverdue: overdueList.slice(0, 5),
  };
}

// ── Sales Trend ──────────────────────────────────────────────

export async function getSalesTrendData() {
  const since = monthsAgo(12);

  const [quotes, payments] = await Promise.all([
    prisma.quote.findMany({
      where: { createdAt: { gte: since } },
      select: { status: true, createdAt: true, signedAt: true },
    }),
    prisma.payment.findMany({
      where: { status: "SUCCEEDED", paidAt: { gte: since } },
      select: { amount: true, paidAt: true },
    }),
  ]);

  const months: Array<{ month: string; quotesSent: number; quotesSigned: number; revenue: number }> = [];
  for (let i = 11; i >= 0; i--) {
    const d = monthsAgo(i);
    months.push({ month: fmtMonth(d), quotesSent: 0, quotesSigned: 0, revenue: 0 });
  }

  for (const q of quotes) {
    const key = fmtMonth(q.createdAt);
    const bucket = months.find((m) => m.month === key);
    if (bucket) bucket.quotesSent++;
    if (q.signedAt) {
      const signKey = fmtMonth(q.signedAt);
      const signBucket = months.find((m) => m.month === signKey);
      if (signBucket) signBucket.quotesSigned++;
    }
  }

  for (const p of payments) {
    if (!p.paidAt) continue;
    const key = fmtMonth(p.paidAt);
    const bucket = months.find((m) => m.month === key);
    if (bucket) bucket.revenue += p.amount;
  }

  return months.map((m) => ({
    ...m,
    revenue: Math.round(m.revenue * 100) / 100,
  }));
}

// ── Top Customers ────────────────────────────────────────────

export async function getTopCustomersData() {
  const contacts = await prisma.contact.findMany({
    select: {
      id: true,
      name: true,
      company: true,
      stage: true,
      totalWon: true,
      quotes: { where: { status: { in: ["SENT", "VIEWED"] } }, select: { id: true } },
    },
    orderBy: { totalWon: "desc" },
    take: 10,
  });

  return contacts.map((c, i) => ({
    rank: i + 1,
    id: c.id,
    name: c.name,
    company: c.company,
    totalPaid: c.totalWon,
    openQuotes: c.quotes.length,
    stage: c.stage,
  }));
}

// ── Production Queue ─────────────────────────────────────────

export async function getProductionQueueData() {
  const activeOrders = await prisma.order.findMany({
    where: { status: { in: ["PENDING", "IN_PRODUCTION", "QUALITY_CHECK", "READY_TO_SHIP"] } },
    include: {
      contact: { select: { name: true } },
      lineItems: { select: { name: true, quantity: true, sku: true, inventoryItemId: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  // Get all inventory items for checking stock
  const inventoryItems = await prisma.inventoryItem.findMany({
    where: { isActive: true },
    select: { id: true, name: true, sku: true, qtyAvailable: true },
  });

  const inventoryMap = new Map(inventoryItems.map((i) => [i.id, i]));
  const skuInventoryMap = new Map(inventoryItems.filter((i) => i.sku).map((i) => [i.sku!, i]));

  const ready: Array<{ id: string; orderNumber: string; contactName: string; items: string[]; status: string }> = [];
  const blocked: Array<{ id: string; orderNumber: string; contactName: string; shortages: string[]; status: string }> = [];
  const readyToShip: Array<{ id: string; orderNumber: string; contactName: string; items: string[]; status: string }> = [];

  for (const order of activeOrders) {
    const contactName = order.contact?.name ?? order.shipToName ?? "Unknown";
    const items = order.lineItems.map((li) => li.name);

    if (order.status === "READY_TO_SHIP") {
      readyToShip.push({ id: order.id, orderNumber: order.orderNumber, contactName, items, status: order.status });
      continue;
    }

    if (order.status !== "PENDING" && order.status !== "IN_PRODUCTION") {
      ready.push({ id: order.id, orderNumber: order.orderNumber, contactName, items, status: order.status });
      continue;
    }

    // Check material availability
    const shortages: string[] = [];
    for (const li of order.lineItems) {
      const inv = li.inventoryItemId
        ? inventoryMap.get(li.inventoryItemId)
        : li.sku
          ? skuInventoryMap.get(li.sku)
          : null;

      if (inv && inv.qtyAvailable < li.quantity) {
        shortages.push(`${inv.name} — ${li.quantity} needed, ${inv.qtyAvailable} available`);
      }
    }

    if (shortages.length > 0) {
      blocked.push({ id: order.id, orderNumber: order.orderNumber, contactName, shortages, status: order.status });
    } else {
      ready.push({ id: order.id, orderNumber: order.orderNumber, contactName, items, status: order.status });
    }
  }

  return { ready, blocked, readyToShip };
}

// ── Inventory Health ─────────────────────────────────────────

export async function getInventoryHealthData() {
  const items = await prisma.inventoryItem.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      type: true,
      qtyOnHand: true,
      qtyReserved: true,
      qtyAvailable: true,
      reorderPoint: true,
      isLowStock: true,
      costPerUnit: true,
    },
    orderBy: { name: "asc" },
  });

  const rawMaterials = items
    .filter((i) => i.type === "RAW_MATERIAL")
    .map((i) => ({
      name: i.name,
      qtyOnHand: i.qtyOnHand,
      reorderPoint: i.reorderPoint,
      percentAboveReorder: i.reorderPoint > 0 ? ((i.qtyOnHand - i.reorderPoint) / i.reorderPoint) * 100 : 100,
      isLowStock: i.isLowStock,
    }))
    .sort((a, b) => a.percentAboveReorder - b.percentAboveReorder);

  const finishedProducts = items
    .filter((i) => i.type === "FINISHED_PRODUCT")
    .map((i) => ({
      name: i.name,
      qtyOnHand: i.qtyOnHand,
      qtyReserved: i.qtyReserved,
      qtyAvailable: i.qtyAvailable,
      isLowStock: i.isLowStock,
    }))
    .sort((a, b) => a.qtyAvailable - b.qtyAvailable);

  return { rawMaterials, finishedProducts };
}

// ── Briefing Data Snapshot ───────────────────────────────────

export async function collectBriefingData() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = daysAgo(7);
  const monthStart = startOfMonth(now);

  const [
    ordersByStatus,
    revenueToday,
    revenueWeek,
    revenueMonth,
    overdueInvoices,
    staleQuotes,
    lowStockItems,
    readyToShipCount,
    activeSequences,
    newContactsWeek,
    openPOs,
  ] = await Promise.all([
    prisma.order.groupBy({ by: ["status"], _count: true }),
    prisma.payment.aggregate({ where: { status: "SUCCEEDED", paidAt: { gte: todayStart } }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { status: "SUCCEEDED", paidAt: { gte: weekStart } }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { status: "SUCCEEDED", paidAt: { gte: monthStart } }, _sum: { amount: true } }),
    prisma.invoice.findMany({
      where: { status: "OVERDUE" },
      select: { invoiceNumber: true, contactName: true, amountDue: true, dueDate: true },
      orderBy: { dueDate: "asc" },
      take: 10,
    }),
    prisma.quote.findMany({
      where: { status: { in: ["SENT", "VIEWED"] }, createdAt: { lte: daysAgo(3) } },
      select: { quoteNumber: true, contactName: true, total: true, viewedAt: true, createdAt: true },
      take: 10,
    }),
    prisma.inventoryItem.findMany({
      where: { isActive: true, isLowStock: true },
      select: { name: true, qtyOnHand: true, reorderPoint: true },
    }),
    prisma.order.count({ where: { status: "READY_TO_SHIP" } }),
    prisma.emailSequence.count({ where: { isActive: true } }),
    prisma.contact.count({ where: { createdAt: { gte: weekStart } } }),
    prisma.purchaseOrder.findMany({
      where: { status: { in: ["SENT", "PARTIALLY_RECEIVED"] }, expectedDelivery: { lte: daysAgo(-7) } },
      select: { poNumber: true, vendor: true, total: true, expectedDelivery: true },
    }),
  ]);

  const orderStatusMap: Record<string, number> = {};
  for (const o of ordersByStatus) orderStatusMap[o.status] = o._count;

  // Count blocked orders
  const productionQueue = await getProductionQueueData();

  return {
    timestamp: now.toISOString(),
    orders: {
      byStatus: orderStatusMap,
      blockedCount: productionQueue.blocked.length,
      blockedDetails: productionQueue.blocked.slice(0, 5).map((b) => ({
        orderNumber: b.orderNumber,
        contactName: b.contactName,
        shortages: b.shortages,
      })),
      readyToShipCount,
      readyToBuild: productionQueue.ready.length,
    },
    revenue: {
      today: revenueToday._sum.amount ?? 0,
      thisWeek: revenueWeek._sum.amount ?? 0,
      thisMonth: revenueMonth._sum.amount ?? 0,
    },
    overdueInvoices: overdueInvoices.map((i) => ({
      invoiceNumber: i.invoiceNumber,
      contactName: i.contactName,
      amountDue: i.amountDue,
      daysOverdue: Math.floor((now.getTime() - new Date(i.dueDate).getTime()) / (1000 * 60 * 60 * 24)),
    })),
    staleQuotes: staleQuotes.map((q) => ({
      quoteNumber: q.quoteNumber,
      contactName: q.contactName,
      total: q.total,
      daysSinceSent: Math.floor((now.getTime() - q.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
      viewed: !!q.viewedAt,
    })),
    lowStockItems: lowStockItems.map((i) => ({
      name: i.name,
      onHand: i.qtyOnHand,
      reorderPoint: i.reorderPoint,
    })),
    activeSequences,
    newContactsThisWeek: newContactsWeek,
    openPurchaseOrders: openPOs.map((po) => ({
      poNumber: po.poNumber,
      vendor: po.vendor,
      total: po.total,
      expectedDelivery: po.expectedDelivery?.toISOString() ?? null,
    })),
  };
}
