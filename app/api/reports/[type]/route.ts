import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type ReportRow = Record<string, string | number | boolean | null>;

function parseDate(str: string | null): Date | null {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function money(n: number): number {
  return Math.round(n * 100) / 100;
}

function fmtDate(d: Date | null): string {
  if (!d) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function toCsv(rows: ReportRow[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => {
      const val = row[h];
      if (val === null || val === undefined) return "";
      const str = String(val);
      return str.includes(",") || str.includes('"') || str.includes("\n")
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    }).join(","));
  }
  return lines.join("\n");
}

async function runReport(type: string, from: Date | null, to: Date | null): Promise<{ title: string; rows: ReportRow[] }> {
  const dateFilter = from && to ? { gte: from, lte: to } : from ? { gte: from } : to ? { lte: to } : undefined;

  switch (type) {
    case "revenue-summary": {
      const payments = await prisma.payment.findMany({
        where: { status: "SUCCEEDED", ...(dateFilter ? { paidAt: dateFilter } : {}) },
        include: { invoice: { select: { invoiceNumber: true, contactName: true } } },
        orderBy: { paidAt: "desc" },
      });
      return {
        title: "Revenue Summary",
        rows: payments.map((p) => ({
          Date: fmtDate(p.paidAt),
          Invoice: p.invoice.invoiceNumber,
          Customer: p.invoice.contactName,
          Amount: money(p.amount),
          Method: p.method,
        })),
      };
    }

    case "ar-aging": {
      const invoices = await prisma.invoice.findMany({
        where: { status: { in: ["SENT", "VIEWED", "OVERDUE", "PARTIAL"] } },
        orderBy: { dueDate: "asc" },
      });
      const now = new Date();
      return {
        title: "Accounts Receivable Aging",
        rows: invoices.map((i) => {
          const daysOverdue = Math.max(0, Math.floor((now.getTime() - new Date(i.dueDate).getTime()) / (1000 * 60 * 60 * 24)));
          return {
            Customer: i.contactName,
            "Invoice #": i.invoiceNumber,
            Amount: money(i.amountDue),
            Issued: fmtDate(i.issuedAt),
            Due: fmtDate(i.dueDate),
            "Days Overdue": daysOverdue,
            Status: i.status,
          };
        }),
      };
    }

    case "invoice-history": {
      const invoices = await prisma.invoice.findMany({
        where: dateFilter ? { issuedAt: dateFilter } : {},
        include: { payments: { where: { status: "SUCCEEDED" } } },
        orderBy: { issuedAt: "desc" },
      });
      return {
        title: "Invoice Payment History",
        rows: invoices.map((i) => ({
          "Invoice #": i.invoiceNumber,
          Customer: i.contactName,
          Total: money(i.total),
          Paid: money(i.amountPaid),
          Due: money(i.amountDue),
          Status: i.status,
          "Issued": fmtDate(i.issuedAt),
          "Due Date": fmtDate(i.dueDate),
        })),
      };
    }

    case "top-customers": {
      const contacts = await prisma.contact.findMany({
        orderBy: { totalWon: "desc" },
        take: 50,
        select: { name: true, company: true, totalWon: true, totalQuoted: true, quoteCount: true, stage: true },
      });
      return {
        title: "Top Customers by Revenue",
        rows: contacts.map((c, i) => ({
          Rank: i + 1,
          Name: c.name,
          Company: c.company ?? "",
          "Total Paid": money(c.totalWon),
          "Total Quoted": money(c.totalQuoted),
          Quotes: c.quoteCount,
          Stage: c.stage,
        })),
      };
    }

    case "quote-activity": {
      const quotes = await prisma.quote.findMany({
        where: dateFilter ? { createdAt: dateFilter } : {},
        orderBy: { createdAt: "desc" },
      });
      return {
        title: "Quote Activity",
        rows: quotes.map((q) => ({
          "Quote #": q.quoteNumber,
          Customer: q.contactName,
          Sent: fmtDate(q.sentAt),
          Viewed: fmtDate(q.viewedAt),
          Signed: fmtDate(q.signedAt),
          Total: money(q.total),
          Status: q.status,
        })),
      };
    }

    case "quote-conversion": {
      const quotes = await prisma.quote.findMany({
        where: dateFilter ? { createdAt: dateFilter } : {},
      });
      const total = quotes.length;
      const signed = quotes.filter((q) => q.signedAt).length;
      const converted = quotes.filter((q) => q.status === "CONVERTED").length;
      return {
        title: "Quote Conversion Rate",
        rows: [{
          "Total Quotes": total,
          "Signed": signed,
          "Converted": converted,
          "Sign Rate": total > 0 ? `${Math.round((signed / total) * 100)}%` : "0%",
          "Conversion Rate": total > 0 ? `${Math.round((converted / total) * 100)}%` : "0%",
        }],
      };
    }

    case "pipeline-by-stage": {
      const contacts = await prisma.contact.groupBy({
        by: ["stage"],
        _count: true,
        _sum: { totalQuoted: true },
      });
      return {
        title: "Pipeline Value by Stage",
        rows: contacts.map((c) => ({
          Stage: c.stage,
          Contacts: c._count,
          "Pipeline Value": money(c._sum.totalQuoted ?? 0),
        })),
      };
    }

    case "inventory-valuation": {
      const items = await prisma.inventoryItem.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      });
      return {
        title: "Inventory Valuation Summary",
        rows: items.map((i) => ({
          Name: i.name,
          SKU: i.sku ?? "",
          Type: i.type,
          "On Hand": i.qtyOnHand,
          Reserved: i.qtyReserved,
          Available: i.qtyAvailable,
          "Unit Cost": money(i.costPerUnit),
          "Total Value": money(i.totalValue),
          "Low Stock": i.isLowStock ? "Yes" : "No",
        })),
      };
    }

    case "stock-status": {
      const items = await prisma.inventoryItem.findMany({
        where: { isActive: true },
        orderBy: [{ isLowStock: "desc" }, { name: "asc" }],
      });
      return {
        title: "Stock Status Report",
        rows: items.map((i) => ({
          Name: i.name,
          SKU: i.sku ?? "",
          "On Hand": i.qtyOnHand,
          Reserved: i.qtyReserved,
          Available: i.qtyAvailable,
          "Reorder Point": i.reorderPoint,
          "On Order": i.qtyOnOrder,
          Status: i.isLowStock ? "LOW STOCK" : "OK",
        })),
      };
    }

    case "low-stock": {
      const items = await prisma.inventoryItem.findMany({
        where: { isActive: true, isLowStock: true },
        orderBy: { name: "asc" },
      });
      return {
        title: "Low Stock Alert Report",
        rows: items.map((i) => ({
          Name: i.name,
          SKU: i.sku ?? "",
          Type: i.type,
          "On Hand": i.qtyOnHand,
          "Reorder Point": i.reorderPoint,
          "Reorder Qty": i.reorderQty,
          Vendor: i.vendor ?? "",
        })),
      };
    }

    case "material-usage": {
      const movements = await prisma.stockMovement.findMany({
        where: { type: "OUT", ...(dateFilter ? { createdAt: dateFilter } : {}) },
        include: { item: { select: { name: true, sku: true } } },
        orderBy: { createdAt: "desc" },
      });
      return {
        title: "Material Usage Report",
        rows: movements.map((m) => ({
          Date: fmtDate(m.createdAt),
          Item: m.item.name,
          SKU: m.item.sku ?? "",
          Quantity: Math.abs(m.qtyChange),
          Reason: m.reason,
          Reference: m.referenceNumber ?? "",
        })),
      };
    }

    case "purchase-orders": {
      const pos = await prisma.purchaseOrder.findMany({
        where: dateFilter ? { createdAt: dateFilter } : {},
        include: { items: true },
        orderBy: { createdAt: "desc" },
      });
      return {
        title: "Purchase Order History",
        rows: pos.map((po) => ({
          "PO #": po.poNumber,
          Vendor: po.vendor,
          Status: po.status,
          Items: po.items.length,
          Total: money(po.total),
          "Expected Delivery": fmtDate(po.expectedDelivery),
          Created: fmtDate(po.createdAt),
        })),
      };
    }

    case "order-fulfillment": {
      const orders = await prisma.order.findMany({
        where: dateFilter ? { createdAt: dateFilter } : {},
        include: { contact: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      });
      return {
        title: "Order Fulfillment Summary",
        rows: orders.map((o) => {
          const daysToShip = o.shippedAt && o.createdAt
            ? Math.floor((o.shippedAt.getTime() - o.createdAt.getTime()) / (1000 * 60 * 60 * 24))
            : null;
          return {
            "Order #": o.orderNumber,
            Customer: o.contact?.name ?? o.shipToName ?? "",
            Created: fmtDate(o.createdAt),
            Shipped: fmtDate(o.shippedAt),
            Delivered: fmtDate(o.deliveredAt),
            "Days to Ship": daysToShip ?? "",
            Carrier: o.carrier ?? "",
            "Shipping Cost": money(o.shippingCost),
            Status: o.status,
          };
        }),
      };
    }

    case "shipping-cost": {
      const orders = await prisma.order.findMany({
        where: { shippedAt: { not: null }, ...(dateFilter ? { shippedAt: dateFilter } : {}) },
        orderBy: { shippedAt: "desc" },
      });
      return {
        title: "Shipping Cost Summary",
        rows: orders.map((o) => ({
          "Order #": o.orderNumber,
          Carrier: o.carrier ?? "",
          Service: o.serviceLevel ?? "",
          Cost: money(o.shippingCost),
          Shipped: fmtDate(o.shippedAt),
        })),
      };
    }

    case "production-queue": {
      const orders = await prisma.order.findMany({
        where: { status: { in: ["PENDING", "IN_PRODUCTION", "QUALITY_CHECK", "READY_TO_SHIP"] } },
        include: { contact: { select: { name: true } }, lineItems: true },
        orderBy: { createdAt: "asc" },
      });
      return {
        title: "Production Queue Status",
        rows: orders.map((o) => ({
          "Order #": o.orderNumber,
          Customer: o.contact?.name ?? o.shipToName ?? "",
          Status: o.status,
          Items: o.lineItems.length,
          Created: fmtDate(o.createdAt),
          "Ship By": fmtDate(o.shipByDate),
        })),
      };
    }

    case "email-campaigns": {
      const campaigns = await prisma.emailCampaign.findMany({
        where: dateFilter ? { createdAt: dateFilter } : {},
        orderBy: { createdAt: "desc" },
      });
      return {
        title: "Email Campaign Performance",
        rows: campaigns.map((c) => ({
          Name: c.name,
          Status: c.status,
          Sent: c.sentCount,
          Opens: c.openCount,
          Clicks: c.clickCount,
          Unsubs: c.unsubCount,
          "Open Rate": c.sentCount > 0 ? `${Math.round((c.openCount / c.sentCount) * 100)}%` : "0%",
          "Sent At": fmtDate(c.sentAt),
        })),
      };
    }

    case "sequence-performance": {
      const sequences = await prisma.emailSequence.findMany({
        include: { steps: true, _count: { select: { enrollments: true } } },
        orderBy: { createdAt: "desc" },
      });
      return {
        title: "Sequence Performance",
        rows: sequences.map((s) => ({
          Name: s.name,
          Trigger: s.trigger,
          Active: s.isActive ? "Yes" : "No",
          Steps: s.steps.length,
          Enrolled: s._count.enrollments,
          "Total Sent": s.totalSent,
          "Avg Open Rate": s.totalSent > 0
            ? `${Math.round((s.steps.reduce((sum, st) => sum + st.openCount, 0) / s.totalSent) * 100)}%`
            : "0%",
        })),
      };
    }

    case "contact-growth": {
      const contacts = await prisma.contact.findMany({
        select: { createdAt: true, stage: true },
        orderBy: { createdAt: "asc" },
      });
      // Group by month
      const byMonth: Record<string, number> = {};
      for (const c of contacts) {
        const key = c.createdAt.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        byMonth[key] = (byMonth[key] ?? 0) + 1;
      }
      let cumulative = 0;
      return {
        title: "Contact Growth Over Time",
        rows: Object.entries(byMonth).map(([month, count]) => {
          cumulative += count;
          return { Month: month, "New Contacts": count, "Total Contacts": cumulative };
        }),
      };
    }

    default:
      return { title: "Unknown Report", rows: [] };
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  try {
    const { type } = await params;
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get("format") ?? "json";
    const from = parseDate(searchParams.get("from"));
    const to = parseDate(searchParams.get("to"));

    const { title, rows } = await runReport(type, from, to);

    if (format === "csv") {
      const csv = toCsv(rows);
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${type}-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    return NextResponse.json({ data: { title, rows, count: rows.length } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to run report";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
