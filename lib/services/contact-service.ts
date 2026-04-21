import { AuditAction, AuditEntityType, type LeadStage, type ActivityType } from "@prisma/client";

import type { ActionActor } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import type { ContactFormValues } from "@/lib/schemas/contact";

import { createAuditLog } from "./audit-service";

// ── List Contacts ───────────────────────────────────────────

export async function listContacts(filters?: {
  search?: string;
  stage?: LeadStage;
  tag?: string;
  sort?: string;
}) {
  const where: Record<string, unknown> = {};

  if (filters?.stage) {
    where.stage = filters.stage;
  }

  if (filters?.tag) {
    where.tags = { has: filters.tag };
  }

  if (filters?.search) {
    const term = filters.search;
    where.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { email: { contains: term, mode: "insensitive" } },
      { company: { contains: term, mode: "insensitive" } },
    ];
  }

  let orderBy: Record<string, string> = { createdAt: "desc" };
  if (filters?.sort === "name") orderBy = { name: "asc" };
  if (filters?.sort === "totalQuoted") orderBy = { totalQuoted: "desc" };
  if (filters?.sort === "lastActivity") orderBy = { lastActivity: "desc" };

  return prisma.contact.findMany({
    where,
    orderBy,
    include: {
      _count: { select: { quotes: true } },
    },
  });
}

// ── Get Single Contact ──────────────────────────────────────

export async function getContact(id: string) {
  return prisma.contact.findUnique({
    where: { id },
    include: {
      quotes: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          quoteNumber: true,
          status: true,
          total: true,
          pricingTier: true,
          createdAt: true,
          sentAt: true,
          viewedAt: true,
          viewCount: true,
          signedAt: true,
          signerName: true,
          convertedToOrderAt: true,
          contactName: true,
          contactEmail: true,
          publicToken: true,
          _count: { select: { lineItems: true } },
        },
      },
      invoices: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          total: true,
          amountDue: true,
          amountPaid: true,
          dueDate: true,
          createdAt: true,
        },
      },
      activities: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });
}

// ── Create Contact ──────────────────────────────────────────

export async function createContact(
  values: ContactFormValues,
  actor: ActionActor,
) {
  const contact = await prisma.contact.create({
    data: {
      name: values.name,
      email: values.email,
      phone: values.phone || null,
      company: values.company || null,
      title: values.title || null,
      address: values.address || null,
      city: values.city || null,
      state: values.state || null,
      zip: values.zip || null,
      source: values.source || null,
      tags: values.tags,
      notes: values.notes || null,
      stage: values.stage,
      lastActivity: new Date(),
    },
  });

  await createAuditLog({
    actor,
    entityType: AuditEntityType.CONTACT,
    entityId: contact.id,
    action: AuditAction.CREATE,
    summary: `Created contact ${values.name}.`,
  });

  return contact;
}

// ── Update Contact ──────────────────────────────────────────

export async function updateContact(
  id: string,
  values: ContactFormValues,
  actor: ActionActor,
) {
  const contact = await prisma.contact.update({
    where: { id },
    data: {
      name: values.name,
      email: values.email,
      phone: values.phone || null,
      company: values.company || null,
      title: values.title || null,
      address: values.address || null,
      city: values.city || null,
      state: values.state || null,
      zip: values.zip || null,
      source: values.source || null,
      tags: values.tags,
      notes: values.notes || null,
      stage: values.stage,
    },
  });

  await createAuditLog({
    actor,
    entityType: AuditEntityType.CONTACT,
    entityId: contact.id,
    action: AuditAction.UPDATE,
    summary: `Updated contact ${values.name}.`,
  });

  return contact;
}

// ── Delete Contact ──────────────────────────────────────────

export async function deleteContact(id: string, actor: ActionActor) {
  const contact = await prisma.contact.findUnique({ where: { id } });
  if (!contact) throw new Error("Contact not found");

  await prisma.contact.delete({ where: { id } });

  await createAuditLog({
    actor,
    entityType: AuditEntityType.CONTACT,
    entityId: id,
    action: AuditAction.ARCHIVE,
    summary: `Deleted contact ${contact.name}.`,
  });
}

// ── Update Stage ────────────────────────────────────────────

export async function updateContactStage(
  id: string,
  newStage: LeadStage,
  actor: ActionActor,
) {
  const contact = await prisma.contact.findUnique({ where: { id } });
  if (!contact) throw new Error("Contact not found");

  const oldStage = contact.stage;

  const updated = await prisma.contact.update({
    where: { id },
    data: {
      stage: newStage,
      lastActivity: new Date(),
    },
  });

  // Log system activity
  await prisma.contactActivity.create({
    data: {
      contactId: id,
      type: "STAGE_CHANGED",
      content: `Stage changed from ${oldStage} to ${newStage}`,
      createdBy: actor.id,
    },
  });

  return updated;
}

// ── Add Activity ────────────────────────────────────────────

export async function addActivity(
  contactId: string,
  type: ActivityType,
  content: string,
  createdBy: string,
  metadata?: string,
) {
  const activity = await prisma.contactActivity.create({
    data: {
      contactId,
      type,
      content,
      metadata,
      createdBy,
    },
  });

  await prisma.contact.update({
    where: { id: contactId },
    data: { lastActivity: new Date() },
  });

  return activity;
}

// ── Get Activities (paginated) ──────────────────────────────

export async function getActivities(
  contactId: string,
  skip = 0,
  take = 20,
) {
  return prisma.contactActivity.findMany({
    where: { contactId },
    orderBy: { createdAt: "desc" },
    skip,
    take,
  });
}

// ── Recalculate Contact Stats ───────────────────────────────

export async function recalcContactStats(contactId: string) {
  const quotes = await prisma.quote.findMany({
    where: { contactId },
    select: { total: true, status: true },
  });

  const totalQuoted = quotes.reduce((sum, q) => sum + q.total, 0);
  const totalWon = quotes
    .filter((q) => q.status === "SIGNED" || q.status === "CONVERTED")
    .reduce((sum, q) => sum + q.total, 0);
  const quoteCount = quotes.length;

  await prisma.contact.update({
    where: { id: contactId },
    data: { totalQuoted, totalWon, quoteCount },
  });
}

// ── Pipeline Data ───────────────────────────────────────────

export async function getPipelineData() {
  const contacts = await prisma.contact.findMany({
    orderBy: { lastActivity: "desc" },
    include: {
      quotes: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          quoteNumber: true,
          status: true,
          total: true,
        },
      },
      invoices: {
        where: { status: { notIn: ["PAID", "CANCELLED", "REFUNDED"] } },
        select: { status: true, amountDue: true },
      },
    },
  });

  const stages: LeadStage[] = ["NEW", "CONTACTED", "QUOTED", "NEGOTIATING", "WON", "LOST"];
  const pipeline = stages.map((stage) => {
    const stageContacts = contacts.filter((c) => c.stage === stage);
    const totalValue = stageContacts.reduce((sum, c) => sum + c.totalQuoted, 0);
    return {
      stage,
      contacts: stageContacts,
      count: stageContacts.length,
      totalValue,
    };
  });

  return pipeline;
}

// ── Search Contacts (for autocomplete) ──────────────────────

export async function searchContacts(query: string) {
  if (!query || query.length < 2) return [];

  return prisma.contact.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
        { company: { contains: query, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      company: true,
    },
    take: 10,
  });
}

// ── All Unique Tags ─────────────────────────────────────────

export async function getAllTags(): Promise<string[]> {
  const contacts = await prisma.contact.findMany({
    select: { tags: true },
  });
  const tagSet = new Set<string>();
  contacts.forEach((c) => c.tags.forEach((t) => tagSet.add(t)));
  return Array.from(tagSet).sort();
}

// ── Attention Count (new leads) ─────────────────────────────

export async function getContactAttentionCount() {
  return prisma.contact.count({
    where: { stage: "NEW" },
  });
}
