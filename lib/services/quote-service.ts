import { AuditAction, AuditEntityType, type QuoteStatus } from "@prisma/client";

import type { ActionActor } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import type { QuoteFormValues } from "@/lib/schemas/quote";

import { createAuditLog } from "./audit-service";
import { addActivity, recalcContactStats } from "./contact-service";

// ── Quote Number Generation ──────────────────────────────────

async function generateQuoteNumber(contactId: string | null): Promise<string> {
  const year = new Date().getFullYear();
  if (!contactId) {
    const count = await prisma.quote.count({ where: { contactId: null } });
    return `RB-QT-${year}-C0000-${String(count + 1).padStart(4, "0")}`;
  }
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    select: { clientNumber: true },
  });
  const clientNum = contact?.clientNumber ?? "C0000";
  const perClientCount = await prisma.quote.count({ where: { contactId } });
  return `RB-QT-${year}-${clientNum}-${String(perClientCount + 1).padStart(4, "0")}`;
}

// ── List Quotes ──────────────────────────────────────────────

export async function listQuotes(filters?: {
  status?: QuoteStatus;
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
      { quoteNumber: { contains: term, mode: "insensitive" } },
      { contactEmail: { contains: term, mode: "insensitive" } },
    ];
  }

  return prisma.quote.findMany({
    where,
    include: {
      contact: { select: { clientNumber: true } },
      lineItems: { orderBy: { sortOrder: "asc" } },
      _count: { select: { lineItems: true } },
      invoice: { select: { id: true, invoiceNumber: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

// ── Get Single Quote ─────────────────────────────────────────

export async function getQuote(id: string) {
  return prisma.quote.findUnique({
    where: { id },
    include: {
      lineItems: { orderBy: { sortOrder: "asc" } },
      events: { orderBy: { createdAt: "desc" } },
    },
  });
}

// ── Get Quote by Public Token ────────────────────────────────

export async function getQuoteByToken(token: string) {
  return prisma.quote.findUnique({
    where: { publicToken: token },
    include: {
      contact: { select: { clientNumber: true } },
      lineItems: { orderBy: { sortOrder: "asc" } },
    },
  });
}

// ── Create Quote ─────────────────────────────────────────────

export async function createQuote(
  values: QuoteFormValues & { contactId?: string },
  actor: ActionActor,
) {
  const quoteNumber = await generateQuoteNumber(values.contactId || null);

  const quote = await prisma.quote.create({
    data: {
      quoteNumber,
      pricingTier: values.pricingTier ?? "RETAIL",
      contactId: values.contactId || null,
      contactName: values.contactName,
      contactEmail: values.contactEmail,
      contactPhone: values.contactPhone || null,
      companyName: values.companyName || null,
      customerMessage: values.customerMessage || null,
      notes: values.notes || null,
      terms: values.terms || null,
      validUntil: values.validUntil ? new Date(values.validUntil) : null,
      subtotal: values.subtotal,
      discountAmount: values.discountAmount,
      taxRate: values.taxRate,
      taxAmount: values.taxAmount,
      total: values.total,
      createdBy: actor.id,
      lineItems: {
        create: values.lineItems.map((item, index) => ({
          skuId: item.skuId || null,
          skuCode: item.skuCode || null,
          name: item.name,
          description: item.description || null,
          imageUrl: item.imageUrl || null,
          category: item.category || null,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          discount: item.discount,
          lineTotal: item.lineTotal,
          customerCanEditQty: item.customerCanEditQty,
          customerCanRemove: item.customerCanRemove,
          isOptional: item.isOptional,
          isSelected: item.isSelected,
          sortOrder: index,
        })),
      },
      events: {
        create: {
          event: "CREATED",
          metadata: JSON.stringify({ actor: actor.displayName }),
        },
      },
    },
    include: {
      lineItems: { orderBy: { sortOrder: "asc" } },
      events: true,
    },
  });

  await createAuditLog({
    actor,
    entityType: AuditEntityType.QUOTE,
    entityId: quote.id,
    action: AuditAction.CREATE,
    summary: `Created quote ${quoteNumber} for ${values.contactName}.`,
  });

  // Fire contact activity if linked
  if (values.contactId) {
    await addActivity(
      values.contactId,
      "QUOTE_CREATED",
      `Quote ${quoteNumber} created — $${quote.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      actor.id,
      JSON.stringify({ quoteId: quote.id, quoteNumber, amount: quote.total }),
    );
    await recalcContactStats(values.contactId);
  }

  return quote;
}

// ── Update Quote ─────────────────────────────────────────────

export async function updateQuote(
  id: string,
  values: QuoteFormValues & { contactId?: string },
  actor: ActionActor,
) {
  // Delete existing line items and recreate
  await prisma.quoteLineItem.deleteMany({ where: { quoteId: id } });

  const quote = await prisma.quote.update({
    where: { id },
    data: {
      pricingTier: values.pricingTier ?? "RETAIL",
      contactId: values.contactId || null,
      contactName: values.contactName,
      contactEmail: values.contactEmail,
      contactPhone: values.contactPhone || null,
      companyName: values.companyName || null,
      customerMessage: values.customerMessage || null,
      notes: values.notes || null,
      terms: values.terms || null,
      validUntil: values.validUntil ? new Date(values.validUntil) : null,
      subtotal: values.subtotal,
      discountAmount: values.discountAmount,
      taxRate: values.taxRate,
      taxAmount: values.taxAmount,
      total: values.total,
      lineItems: {
        create: values.lineItems.map((item, index) => ({
          skuId: item.skuId || null,
          skuCode: item.skuCode || null,
          name: item.name,
          description: item.description || null,
          imageUrl: item.imageUrl || null,
          category: item.category || null,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          discount: item.discount,
          lineTotal: item.lineTotal,
          customerCanEditQty: item.customerCanEditQty,
          customerCanRemove: item.customerCanRemove,
          isOptional: item.isOptional,
          isSelected: item.isSelected,
          sortOrder: index,
        })),
      },
      events: {
        create: {
          event: "UPDATED",
          metadata: JSON.stringify({ actor: actor.displayName }),
        },
      },
    },
    include: {
      lineItems: { orderBy: { sortOrder: "asc" } },
      events: { orderBy: { createdAt: "desc" } },
    },
  });

  await createAuditLog({
    actor,
    entityType: AuditEntityType.QUOTE,
    entityId: quote.id,
    action: AuditAction.UPDATE,
    summary: `Updated quote ${quote.quoteNumber}.`,
  });

  return quote;
}

// ── Delete Quote ─────────────────────────────────────────────

export async function deleteQuote(id: string, actor: ActionActor) {
  const quote = await prisma.quote.findUnique({ where: { id } });
  if (!quote) throw new Error("Quote not found");
  if (quote.status !== "DRAFT") throw new Error("Only draft quotes can be deleted");

  await prisma.quote.delete({ where: { id } });

  await createAuditLog({
    actor,
    entityType: AuditEntityType.QUOTE,
    entityId: id,
    action: AuditAction.ARCHIVE,
    summary: `Deleted draft quote ${quote.quoteNumber}.`,
  });
}

// ── Send Quote ───────────────────────────────────────────────

export async function markQuoteSent(id: string, actor: ActionActor) {
  const quote = await prisma.quote.update({
    where: { id },
    data: {
      status: "SENT",
      sentAt: new Date(),
      events: {
        create: {
          event: "SENT",
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
    entityType: AuditEntityType.QUOTE,
    entityId: quote.id,
    action: AuditAction.UPDATE,
    summary: `Sent quote ${quote.quoteNumber} to ${quote.contactEmail}.`,
  });

  // Fire contact activity if linked
  if (quote.contactId) {
    await addActivity(
      quote.contactId,
      "QUOTE_SENT",
      `Quote ${quote.quoteNumber} sent to ${quote.contactEmail}`,
      actor.id,
      JSON.stringify({ quoteId: quote.id, quoteNumber: quote.quoteNumber, amount: quote.total }),
    );
  }

  return quote;
}

// ── Track View ───────────────────────────────────────────────

export async function trackQuoteView(
  token: string,
  ip: string | null,
  userAgent: string | null,
) {
  const quote = await prisma.quote.findUnique({
    where: { publicToken: token },
  });

  if (!quote) return null;

  const isFirstView = !quote.viewedAt;
  const updateStatus =
    quote.status === "SENT" || (isFirstView && quote.status === "DRAFT");

  await prisma.quote.update({
    where: { id: quote.id },
    data: {
      viewCount: { increment: 1 },
      ...(isFirstView ? { viewedAt: new Date() } : {}),
      ...(updateStatus ? { status: "VIEWED" } : {}),
      events: {
        create: {
          event: "VIEWED",
          ip,
          userAgent,
        },
      },
    },
  });

  // Fire contact activity on first view
  if (isFirstView && quote.contactId) {
    await addActivity(
      quote.contactId,
      "QUOTE_VIEWED",
      `Quote ${quote.quoteNumber} viewed by customer`,
      "system",
      JSON.stringify({ quoteId: quote.id, quoteNumber: quote.quoteNumber }),
    );
  }

  return quote;
}

// ── Sign Quote ───────────────────────────────────────────────

export async function signQuote(input: {
  token: string;
  signerName: string;
  signatureData: string;
  ip: string | null;
  userAgent: string | null;
  selectedItems?: string[];
}) {
  const quote = await prisma.quote.findUnique({
    where: { publicToken: input.token },
    include: { lineItems: true },
  });

  if (!quote) throw new Error("Quote not found");
  if (quote.status === "SIGNED" || quote.status === "CONVERTED") {
    throw new Error("Quote has already been signed");
  }
  if (quote.status === "EXPIRED" || quote.status === "DECLINED") {
    throw new Error("Quote is no longer available");
  }

  // Update optional item selections if provided
  if (input.selectedItems) {
    for (const item of quote.lineItems) {
      if (item.isOptional) {
        const isSelected = input.selectedItems.includes(item.id);
        await prisma.quoteLineItem.update({
          where: { id: item.id },
          data: { isSelected },
        });
      }
    }
  }

  // Recalculate totals based on selected items
  const allItems = await prisma.quoteLineItem.findMany({
    where: { quoteId: quote.id },
  });

  const subtotal = allItems
    .filter((item) => !item.isOptional || item.isSelected)
    .reduce((sum, item) => sum + item.lineTotal, 0);

  const discountAmount = quote.discountAmount;
  const afterDiscount = subtotal - discountAmount;
  const taxAmount = afterDiscount * (quote.taxRate / 100);
  const total = afterDiscount + taxAmount;

  const signedQuote = await prisma.quote.update({
    where: { id: quote.id },
    data: {
      status: "SIGNED",
      signedAt: new Date(),
      signatureData: input.signatureData,
      signerName: input.signerName,
      signerIp: input.ip,
      subtotal,
      taxAmount,
      total,
      events: {
        create: {
          event: "SIGNED",
          ip: input.ip,
          userAgent: input.userAgent,
          metadata: JSON.stringify({ signerName: input.signerName }),
        },
      },
    },
    include: {
      lineItems: { orderBy: { sortOrder: "asc" } },
    },
  });

  // Fire contact activity if linked
  if (quote.contactId) {
    await addActivity(
      quote.contactId,
      "QUOTE_SIGNED",
      `Quote ${quote.quoteNumber} signed by ${input.signerName} — $${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      "system",
      JSON.stringify({ quoteId: quote.id, quoteNumber: quote.quoteNumber, amount: total }),
    );
    await recalcContactStats(quote.contactId);
    // Move contact to WON stage
    await prisma.contact.update({
      where: { id: quote.contactId },
      data: { stage: "WON", lastActivity: new Date() },
    });
  }

  return signedQuote;
}

// ── Convert to Order ─────────────────────────────────────────

export async function convertToOrder(id: string, actor: ActionActor) {
  const quote = await prisma.quote.findUnique({ where: { id } });
  if (!quote) throw new Error("Quote not found");
  if (quote.status !== "SIGNED") {
    throw new Error("Only signed quotes can be converted to orders");
  }

  const updatedQuote = await prisma.quote.update({
    where: { id },
    data: {
      status: "CONVERTED",
      convertedToOrderAt: new Date(),
      events: {
        create: {
          event: "CONVERTED",
          metadata: JSON.stringify({ actor: actor.displayName }),
        },
      },
    },
  });

  await createAuditLog({
    actor,
    entityType: AuditEntityType.QUOTE,
    entityId: id,
    action: AuditAction.UPDATE,
    summary: `Converted quote ${quote.quoteNumber} to order.`,
  });

  // Fire contact activity if linked
  if (quote.contactId) {
    await addActivity(
      quote.contactId,
      "QUOTE_CONVERTED",
      `Quote ${quote.quoteNumber} converted to order`,
      actor.id,
      JSON.stringify({ quoteId: quote.id, quoteNumber: quote.quoteNumber, amount: quote.total }),
    );
  }

  return updatedQuote;
}

// ── Duplicate Quote ──────────────────────────────────────────

export async function duplicateQuote(id: string, actor: ActionActor) {
  const original = await prisma.quote.findUnique({
    where: { id },
    include: { lineItems: { orderBy: { sortOrder: "asc" } } },
  });

  if (!original) throw new Error("Quote not found");

  const quoteNumber = await generateQuoteNumber(original.contactId);

  const duplicate = await prisma.quote.create({
    data: {
      quoteNumber,
      pricingTier: original.pricingTier,
      contactId: original.contactId,
      contactName: original.contactName,
      contactEmail: original.contactEmail,
      contactPhone: original.contactPhone,
      companyName: original.companyName,
      customerMessage: original.customerMessage,
      notes: original.notes,
      terms: original.terms,
      validUntil: original.validUntil,
      subtotal: original.subtotal,
      discountAmount: original.discountAmount,
      taxRate: original.taxRate,
      taxAmount: original.taxAmount,
      total: original.total,
      createdBy: actor.id,
      lineItems: {
        create: original.lineItems.map((item, index) => ({
          skuId: item.skuId,
          skuCode: item.skuCode,
          name: item.name,
          description: item.description,
          imageUrl: item.imageUrl,
          category: item.category,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          discount: item.discount,
          lineTotal: item.lineTotal,
          customerCanEditQty: item.customerCanEditQty,
          customerCanRemove: item.customerCanRemove,
          isOptional: item.isOptional,
          isSelected: item.isSelected,
          sortOrder: index,
        })),
      },
      events: {
        create: {
          event: "CREATED",
          metadata: JSON.stringify({
            actor: actor.displayName,
            duplicatedFrom: original.quoteNumber,
          }),
        },
      },
    },
    include: {
      lineItems: { orderBy: { sortOrder: "asc" } },
    },
  });

  return duplicate;
}

// ── Badge Count ──────────────────────────────────────────────

export async function getAttentionCount() {
  return prisma.quote.count({
    where: {
      status: { in: ["SENT", "VIEWED"] },
    },
  });
}
