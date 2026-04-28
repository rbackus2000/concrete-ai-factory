import { ActivityType, AuditAction, AuditEntityType } from "@prisma/client";

import type { ActionActor } from "@/lib/auth/session";
import { getSystemActor } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import type { TradeApplicationPayload } from "@/lib/schemas/trade-application";

import { addActivity, createContact } from "./contact-service";
import { createAuditLog } from "./audit-service";
import {
  sendTradeDeclineEmail,
  sendTradeWelcomeEmail,
} from "./postmark-service";
import {
  createTradeMember,
  generateLoginToken,
} from "./trade-member-service";

const TRADE_LEAD_TAG = "Trade Lead";
const TRADE_PENDING_TAG = "Trade — Pending Review";
const TRADE_SOURCE = "Website — Trade Application";

function buildSummary(payload: TradeApplicationPayload): string {
  const lines: string[] = [];
  lines.push(`Trade application submitted via backusdesignco.com/trade/apply`);
  lines.push("");
  lines.push(`Firm: ${payload.firmName}`);
  lines.push(`Profession: ${payload.profession}`);
  if (payload.website) lines.push(`Website: ${payload.website}`);
  if (payload.instagram) lines.push(`Instagram: ${payload.instagram}`);
  if (payload.yearEstablished) lines.push(`Established: ${payload.yearEstablished}`);
  lines.push(
    `Location: ${payload.city}, ${payload.region}${payload.postalCode ? " " + payload.postalCode : ""} — ${payload.country}`,
  );
  lines.push("");
  lines.push("Credentials:");
  lines.push(
    `  Membership/license: ${payload.credentialType || "(blank)"} ${payload.credentialNumber || ""}`.trim(),
  );
  if (payload.resaleCert) lines.push(`  Resale cert: ${payload.resaleCert}`);
  if (payload.ein) lines.push(`  EIN: ${payload.ein}`);
  lines.push("");
  lines.push(`Project types: ${payload.projectTypes.join(", ")}`);
  lines.push(`Estimated annual volume: ${payload.annualVolume}`);
  lines.push(`How they heard: ${payload.hearAbout}`);
  if (payload.notes) {
    lines.push("");
    lines.push("Notes from applicant:");
    lines.push(payload.notes);
  }
  return lines.join("\n");
}

function mergeTags(existing: string[], incoming: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of [...existing, ...incoming]) {
    const trimmed = t.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

export type TradeApplicationResult = {
  contactId: string;
  clientNumber: string | null;
  isNew: boolean;
};

/**
 * Persist a trade application from the public storefront. Idempotent on
 * email — re-submissions append a new activity to the existing contact
 * rather than creating duplicates.
 */
export async function submitTradeApplication(
  payload: TradeApplicationPayload,
): Promise<TradeApplicationResult> {
  const actor = getSystemActor();
  const fullName = `${payload.firstName} ${payload.lastName}`.trim();
  const summary = buildSummary(payload);
  const tags = [TRADE_LEAD_TAG, TRADE_PENDING_TAG, payload.profession];

  const existing = await prisma.contact.findUnique({
    where: { email: payload.email },
    select: { id: true, clientNumber: true, tags: true, notes: true },
  });

  if (existing) {
    await prisma.contact.update({
      where: { id: existing.id },
      data: {
        tags: mergeTags(existing.tags, tags),
        // Only refresh source if it was empty before — don't clobber an
        // existing attribution like "Referral".
        source: undefined,
        lastActivity: new Date(),
        // Append a marker to notes so reviewing the contact in the CRM
        // surfaces that they re-applied.
        notes: existing.notes
          ? `${existing.notes}\n\n— Re-applied to trade program on ${new Date().toISOString().slice(0, 10)} —`
          : `Re-applied to trade program on ${new Date().toISOString().slice(0, 10)}.`,
      },
    });

    await addActivity(
      existing.id,
      ActivityType.NOTE,
      summary,
      actor.username,
      JSON.stringify(payload),
    );

    return {
      contactId: existing.id,
      clientNumber: existing.clientNumber,
      isNew: false,
    };
  }

  const contact = await createContact(
    {
      name: fullName,
      email: payload.email,
      phone: payload.phone || "",
      company: payload.firmName,
      title: payload.title || "",
      address: "",
      city: payload.city,
      state: payload.region,
      zip: payload.postalCode || "",
      source: TRADE_SOURCE,
      tags,
      notes: summary,
      stage: "NEW",
    },
    actor,
  );

  await addActivity(
    contact.id,
    ActivityType.NOTE,
    summary,
    actor.username,
    JSON.stringify(payload),
  );

  return {
    contactId: contact.id,
    clientNumber: contact.clientNumber,
    isNew: true,
  };
}

// ── Approval / Decline ──

const TRADE_APPROVED_TAG = "Trade — Approved";
const TRADE_DECLINED_TAG = "Trade — Declined";

function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function swapTag(existing: string[], remove: string, add: string): string[] {
  const next = existing.filter((t) => t !== remove);
  if (!next.includes(add)) next.push(add);
  return next;
}

function splitName(fullName: string): { first: string; last: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return { first: "", last: "" };
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

/**
 * Find pending trade applications — Contacts with the
 * "Trade — Pending Review" tag. Includes the most recent NOTE activity
 * (the application body) for inline display in the admin queue.
 */
export async function listPendingTradeApplications() {
  const contacts = await prisma.contact.findMany({
    where: {
      tags: { has: TRADE_PENDING_TAG },
    },
    orderBy: { createdAt: "desc" },
    include: {
      activities: {
        where: { type: ActivityType.NOTE },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
  return contacts;
}

export async function countPendingTradeApplications(): Promise<number> {
  return prisma.contact.count({
    where: { tags: { has: TRADE_PENDING_TAG } },
  });
}

export async function getTradeApplicationDetail(contactId: string) {
  return prisma.contact.findUnique({
    where: { id: contactId },
    include: {
      activities: { orderBy: { createdAt: "desc" } },
      tradeMember: true,
    },
  });
}

/**
 * Approve a trade application: provision a TradeMember, swap tags,
 * generate a magic-link token, send the welcome email, and audit-log.
 */
export async function approveTradeApplication(
  contactId: string,
  actor: ActionActor,
): Promise<{ memberId: string; emailSent: boolean }> {
  const contact = await prisma.contact.findUnique({ where: { id: contactId } });
  if (!contact) throw new Error("Contact not found");
  if (!contact.tags.includes(TRADE_PENDING_TAG)) {
    throw new Error("This contact is not in the pending-review state");
  }

  const { first, last } = splitName(contact.name);
  // Profession is stored as one of the tags — find a non-trade tag.
  const profession = contact.tags.find(
    (t) => t !== TRADE_PENDING_TAG && t !== "Trade Lead" && t !== TRADE_APPROVED_TAG,
  );

  const member = await createTradeMember({
    email: contact.email,
    firmName: contact.company ?? `${first} ${last}`.trim(),
    contactName: contact.name,
    phone: contact.phone,
    profession: profession ?? null,
    linkedContactId: contact.id,
    approvedBy: actor.username,
  });

  await prisma.contact.update({
    where: { id: contact.id },
    data: {
      tags: swapTag(contact.tags, TRADE_PENDING_TAG, TRADE_APPROVED_TAG),
      lastActivity: new Date(),
    },
  });

  await addActivity(
    contact.id,
    ActivityType.NOTE,
    `Trade application approved by ${actor.displayName}. Welcome email + magic-link sent to ${contact.email}.`,
    actor.username,
  );

  await createAuditLog({
    actor,
    entityType: AuditEntityType.CONTACT,
    entityId: contact.id,
    action: AuditAction.UPDATE,
    summary: `Approved trade application for ${contact.name} (${contact.company ?? "—"}).`,
  });

  // Generate magic link + send welcome email. Best-effort — if email
  // sends fails, the approval has already happened and we can resend
  // from the admin UI later.
  let emailSent = false;
  try {
    const { rawToken } = await generateLoginToken(member.id);
    const loginUrl = `${getAppUrl()}/trade/portal/verify?token=${encodeURIComponent(rawToken)}`;
    await sendTradeWelcomeEmail({
      to: contact.email,
      contactName: first || contact.name,
      firmName: member.firmName,
      loginUrl,
    });
    emailSent = true;
  } catch (err) {
    console.error("[trade-application] welcome email failed", err);
  }

  return { memberId: member.id, emailSent };
}

export async function declineTradeApplication(
  contactId: string,
  actor: ActionActor,
  reason?: string | null,
): Promise<{ emailSent: boolean }> {
  const contact = await prisma.contact.findUnique({ where: { id: contactId } });
  if (!contact) throw new Error("Contact not found");
  if (!contact.tags.includes(TRADE_PENDING_TAG)) {
    throw new Error("This contact is not in the pending-review state");
  }

  await prisma.contact.update({
    where: { id: contact.id },
    data: {
      tags: swapTag(contact.tags, TRADE_PENDING_TAG, TRADE_DECLINED_TAG),
      lastActivity: new Date(),
    },
  });

  const reasonNote = reason && reason.trim() ? `\n\nReason: ${reason.trim()}` : "";
  await addActivity(
    contact.id,
    ActivityType.NOTE,
    `Trade application declined by ${actor.displayName}.${reasonNote}`,
    actor.username,
  );

  await createAuditLog({
    actor,
    entityType: AuditEntityType.CONTACT,
    entityId: contact.id,
    action: AuditAction.UPDATE,
    summary: `Declined trade application for ${contact.name} (${contact.company ?? "—"}).`,
  });

  let emailSent = false;
  try {
    const { first } = splitName(contact.name);
    await sendTradeDeclineEmail({
      to: contact.email,
      contactName: first || contact.name,
      firmName: contact.company ?? "your firm",
      reason: reason ?? null,
    });
    emailSent = true;
  } catch (err) {
    console.error("[trade-application] decline email failed", err);
  }

  return { emailSent };
}
