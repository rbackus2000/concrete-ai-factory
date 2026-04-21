import {
  AuditAction,
  AuditEntityType,
  type InvoiceStatus,
  type PaymentMethod,
} from "@prisma/client";

import type { ActionActor } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import type { InvoiceCreateValues } from "@/lib/schemas/invoice";

import { createAuditLog } from "./audit-service";
import { addActivity, recalcContactStats } from "./contact-service";

// ── Invoice Number Generation ───────────────────────────────

async function generateInvoiceNumber(contactId: string | null): Promise<string> {
  const year = new Date().getFullYear();
  if (!contactId) {
    const count = await prisma.invoice.count({ where: { contactId: null } });
    return `RB-INV-${year}-C0000-${String(count + 1).padStart(4, "0")}`;
  }
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    select: { clientNumber: true },
  });
  const clientNum = contact?.clientNumber ?? "C0000";
  const perClientCount = await prisma.invoice.count({ where: { contactId } });
  return `RB-INV-${year}-${clientNum}-${String(perClientCount + 1).padStart(4, "0")}`;
}

// ── List Invoices ───────────────────────────────────────────

export async function listInvoices(filters?: {
  status?: InvoiceStatus;
  search?: string;
}) {
  const where: Record<string, unknown> = {};

  if (filters?.status) {
    where.status = filters.status;
  }

  if (filters?.search) {
    const term = filters.search;
    where.OR = [
      { contactName: { contains: term, mode: "insensitive" } },
      { companyName: { contains: term, mode: "insensitive" } },
      { invoiceNumber: { contains: term, mode: "insensitive" } },
      { contactEmail: { contains: term, mode: "insensitive" } },
    ];
  }

  return prisma.invoice.findMany({
    where,
    include: {
      contact: { select: { clientNumber: true } },
      _count: { select: { lineItems: true, payments: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

// ── Get Single Invoice ──────────────────────────────────────

export async function getInvoice(id: string) {
  return prisma.invoice.findUnique({
    where: { id },
    include: {
      lineItems: { orderBy: { sortOrder: "asc" } },
      payments: { orderBy: { createdAt: "desc" } },
      events: { orderBy: { createdAt: "desc" } },
      reminders: { orderBy: { sentAt: "desc" } },
      quote: { select: { id: true, quoteNumber: true } },
      order: { select: { id: true, orderNumber: true, status: true } },
    },
  });
}

// ── Get by Public Token ─────────────────────────────────────

export async function getInvoiceByToken(token: string) {
  return prisma.invoice.findUnique({
    where: { publicToken: token },
    include: {
      contact: { select: { clientNumber: true } },
      lineItems: { orderBy: { sortOrder: "asc" } },
      payments: {
        where: { status: "SUCCEEDED" },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

// ── Create Invoice (manual) ─────────────────────────────────

export async function createInvoice(
  values: InvoiceCreateValues,
  actor: ActionActor,
) {
  const invoiceNumber = await generateInvoiceNumber(values.contactId || null);
  const amountDue = values.total;

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      contactId: values.contactId || null,
      contactName: values.contactName,
      contactEmail: values.contactEmail,
      contactPhone: values.contactPhone || null,
      companyName: values.companyName || null,
      billingAddress: values.billingAddress || null,
      customerNote: values.customerNote || null,
      notes: values.notes || null,
      dueDate: new Date(values.dueDate),
      depositPercent: values.depositPercent ?? null,
      subtotal: values.subtotal,
      discountAmount: values.discountAmount,
      taxRate: values.taxRate,
      taxAmount: values.taxAmount,
      total: values.total,
      amountDue,
      createdBy: actor.id,
      lineItems: {
        create: values.lineItems.map((item, i) => ({
          name: item.name,
          description: item.description || null,
          imageUrl: item.imageUrl || null,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          lineTotal: item.lineTotal,
          skuId: item.skuId || null,
          sortOrder: i,
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
    include: {
      lineItems: { orderBy: { sortOrder: "asc" } },
    },
  });

  await createAuditLog({
    actor,
    entityType: AuditEntityType.INVOICE,
    entityId: invoice.id,
    action: AuditAction.CREATE,
    summary: `Created invoice ${invoiceNumber} for ${values.contactName}.`,
  });

  if (values.contactId) {
    await addActivity(
      values.contactId,
      "INVOICE_CREATED",
      `Invoice ${invoiceNumber} created — $${invoice.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      actor.id,
      JSON.stringify({ invoiceId: invoice.id, invoiceNumber, amount: invoice.total }),
    );
  }

  return invoice;
}

// ── Create Invoice from Quote ───────────────────────────────

export async function createInvoiceFromQuote(
  quoteId: string,
  actor: ActionActor,
) {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { lineItems: { orderBy: { sortOrder: "asc" } } },
  });

  if (!quote) throw new Error("Quote not found");
  if (quote.status !== "SIGNED") {
    throw new Error("Only signed quotes can be converted to invoices");
  }

  // Check if invoice already exists for this quote
  const existing = await prisma.invoice.findUnique({ where: { quoteId } });
  if (existing) throw new Error("Invoice already exists for this quote");

  const invoiceNumber = await generateInvoiceNumber(quote.contactId);
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);

  const selectedItems = quote.lineItems.filter(
    (item) => !item.isOptional || item.isSelected,
  );

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      quoteId: quote.id,
      contactId: quote.contactId,
      contactName: quote.contactName,
      contactEmail: quote.contactEmail,
      contactPhone: quote.contactPhone,
      companyName: quote.companyName,
      subtotal: quote.subtotal,
      discountAmount: quote.discountAmount,
      taxRate: quote.taxRate,
      taxAmount: quote.taxAmount,
      total: quote.total,
      amountDue: quote.total,
      dueDate,
      createdBy: actor.id,
      lineItems: {
        create: selectedItems.map((item, i) => ({
          name: item.name,
          description: item.description,
          imageUrl: item.imageUrl,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          lineTotal: item.lineTotal,
          skuId: item.skuId,
          sortOrder: i,
        })),
      },
      events: {
        create: {
          event: "CREATED",
          createdBy: actor.id,
          metadata: JSON.stringify({
            actor: actor.displayName,
            fromQuote: quote.quoteNumber,
          }),
        },
      },
    },
  });

  // Update quote status
  await prisma.quote.update({
    where: { id: quoteId },
    data: {
      status: "CONVERTED",
      convertedToOrderAt: new Date(),
      events: {
        create: {
          event: "CONVERTED",
          metadata: JSON.stringify({
            actor: actor.displayName,
            invoiceId: invoice.id,
            invoiceNumber,
          }),
        },
      },
    },
  });

  await createAuditLog({
    actor,
    entityType: AuditEntityType.INVOICE,
    entityId: invoice.id,
    action: AuditAction.CREATE,
    summary: `Created invoice ${invoiceNumber} from quote ${quote.quoteNumber}.`,
  });

  if (quote.contactId) {
    await addActivity(
      quote.contactId,
      "INVOICE_CREATED",
      `Invoice ${invoiceNumber} created from quote ${quote.quoteNumber} — $${invoice.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      actor.id,
      JSON.stringify({ invoiceId: invoice.id, invoiceNumber, quoteNumber: quote.quoteNumber, amount: invoice.total }),
    );
    await recalcContactStats(quote.contactId);
  }

  return invoice;
}

// ── Mark Sent ───────────────────────────────────────────────

export async function markInvoiceSent(id: string, actor: ActionActor) {
  const invoice = await prisma.invoice.update({
    where: { id },
    data: {
      status: "SENT",
      sentAt: new Date(),
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
    entityType: AuditEntityType.INVOICE,
    entityId: invoice.id,
    action: AuditAction.UPDATE,
    summary: `Sent invoice ${invoice.invoiceNumber} to ${invoice.contactEmail}.`,
  });

  if (invoice.contactId) {
    await addActivity(
      invoice.contactId,
      "INVOICE_SENT",
      `Invoice ${invoice.invoiceNumber} sent — $${invoice.amountDue.toLocaleString("en-US", { minimumFractionDigits: 2 })} due`,
      actor.id,
      JSON.stringify({ invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, amount: invoice.amountDue }),
    );
  }

  return invoice;
}

// ── Track View ──────────────────────────────────────────────

export async function trackInvoiceView(
  token: string,
  ip: string | null,
) {
  const invoice = await prisma.invoice.findUnique({
    where: { publicToken: token },
  });
  if (!invoice) return null;

  const isFirstView = !invoice.viewedAt;
  const updateStatus = invoice.status === "SENT" && isFirstView;

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      viewCount: { increment: 1 },
      ...(isFirstView ? { viewedAt: new Date() } : {}),
      ...(updateStatus ? { status: "VIEWED" } : {}),
      events: {
        create: { event: "VIEWED", ip },
      },
    },
  });

  return invoice;
}

// ── Record Payment ──────────────────────────────────────────

export async function recordPayment(
  invoiceId: string,
  input: {
    amount: number;
    method: PaymentMethod;
    note?: string;
    paidAt?: string;
    stripePaymentIntentId?: string;
    stripeChargeId?: string;
    last4?: string;
    brand?: string;
  },
  actor: ActionActor,
) {
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) throw new Error("Invoice not found");
  if (invoice.status === "CANCELLED") throw new Error("Cannot pay a cancelled invoice");

  const payment = await prisma.payment.create({
    data: {
      invoiceId,
      amount: input.amount,
      method: input.method,
      status: "SUCCEEDED",
      stripePaymentIntentId: input.stripePaymentIntentId || null,
      stripeChargeId: input.stripeChargeId || null,
      last4: input.last4 || null,
      brand: input.brand || null,
      note: input.note || null,
      paidAt: input.paidAt ? new Date(input.paidAt) : new Date(),
    },
  });

  const newAmountPaid = invoice.amountPaid + input.amount;
  const newAmountDue = Math.max(0, invoice.total - newAmountPaid);
  const isPaidInFull = newAmountDue <= 0.01;

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      amountPaid: newAmountPaid,
      amountDue: newAmountDue,
      status: isPaidInFull ? "PAID" : "PARTIAL",
      ...(isPaidInFull ? { paidAt: new Date() } : {}),
      events: {
        create: {
          event: "PAYMENT_RECEIVED",
          createdBy: actor.id,
          metadata: JSON.stringify({
            amount: input.amount,
            method: input.method,
            paymentId: payment.id,
            last4: input.last4,
            brand: input.brand,
          }),
        },
      },
    },
  });

  if (invoice.contactId) {
    const methodLabel = input.method.replace("_", " ").toLowerCase();
    await addActivity(
      invoice.contactId,
      "PAYMENT_RECEIVED",
      `Payment of $${input.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })} received (${methodLabel}) for invoice ${invoice.invoiceNumber}${isPaidInFull ? " — PAID IN FULL" : ""}`,
      actor.id,
      JSON.stringify({ invoiceId, invoiceNumber: invoice.invoiceNumber, amount: input.amount, paymentId: payment.id }),
    );
    await recalcContactStats(invoice.contactId);
  }

  return { payment, isPaidInFull, newAmountDue };
}

// ── Send Reminder ───────────────────────────────────────────

export async function recordReminder(
  invoiceId: string,
  type: string,
  emailSentTo: string,
) {
  await prisma.invoiceReminder.create({
    data: { invoiceId, type, emailSentTo },
  });

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      reminderCount: { increment: 1 },
      lastReminderAt: new Date(),
      events: {
        create: {
          event: "REMINDER_SENT",
          metadata: JSON.stringify({ type, emailSentTo }),
        },
      },
    },
  });
}

// ── Cancel Invoice ──────────────────────────────────────────

export async function cancelInvoice(id: string, actor: ActionActor) {
  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) throw new Error("Invoice not found");
  if (invoice.status === "PAID") throw new Error("Cannot cancel a paid invoice");

  const updated = await prisma.invoice.update({
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
    entityType: AuditEntityType.INVOICE,
    entityId: id,
    action: AuditAction.ARCHIVE,
    summary: `Cancelled invoice ${invoice.invoiceNumber}.`,
  });

  return updated;
}

// ── Check Overdue ───────────────────────────────────────────

export async function checkOverdueInvoices() {
  const now = new Date();
  const overdueInvoices = await prisma.invoice.findMany({
    where: {
      dueDate: { lt: now },
      status: { in: ["SENT", "VIEWED", "PARTIAL"] },
    },
  });

  let count = 0;
  for (const inv of overdueInvoices) {
    await prisma.invoice.update({
      where: { id: inv.id },
      data: {
        status: "OVERDUE",
        events: {
          create: { event: "OVERDUE" },
        },
      },
    });

    if (inv.contactId) {
      await addActivity(
        inv.contactId,
        "INVOICE_OVERDUE",
        `Invoice ${inv.invoiceNumber} is overdue — $${inv.amountDue.toLocaleString("en-US", { minimumFractionDigits: 2 })} due`,
        "system",
        JSON.stringify({ invoiceId: inv.id, invoiceNumber: inv.invoiceNumber, amountDue: inv.amountDue }),
      );
    }
    count++;
  }

  return count;
}

// ── Store Payment Link ──────────────────────────────────────

export async function storePaymentLink(
  invoiceId: string,
  linkId: string,
  linkUrl: string,
  paymentIntentId?: string,
) {
  return prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      stripePaymentLinkId: linkId,
      stripePaymentLinkUrl: linkUrl,
      ...(paymentIntentId ? { stripePaymentIntentId: paymentIntentId } : {}),
    },
  });
}

// ── Dashboard Stats ─────────────────────────────────────────

export async function getInvoiceStats() {
  const all = await prisma.invoice.findMany({
    select: { status: true, total: true, amountDue: true, amountPaid: true, paidAt: true },
  });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const outstanding = all
    .filter((i) => !["PAID", "CANCELLED", "REFUNDED", "DRAFT"].includes(i.status))
    .reduce((sum, i) => sum + i.amountDue, 0);

  const overdue = all
    .filter((i) => i.status === "OVERDUE")
    .reduce((sum, i) => sum + i.amountDue, 0);

  const paidThisMonth = all
    .filter((i) => i.status === "PAID" && i.paidAt && i.paidAt >= monthStart)
    .reduce((sum, i) => sum + i.total, 0);

  const draftCount = all.filter((i) => i.status === "DRAFT").length;

  return { outstanding, overdue, paidThisMonth, draftCount };
}

// ── Attention Count (overdue) ───────────────────────────────

export async function getInvoiceAttentionCount() {
  return prisma.invoice.count({
    where: { status: { in: ["OVERDUE", "SENT"] } },
  });
}

// ── Find by Stripe Payment Intent ───────────────────────────

export async function findInvoiceByPaymentIntent(paymentIntentId: string) {
  return prisma.invoice.findFirst({
    where: { stripePaymentIntentId: paymentIntentId },
  });
}
