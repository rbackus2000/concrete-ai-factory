import { ActivityType } from "@prisma/client";

import { getSystemActor } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import type { TradeApplicationPayload } from "@/lib/schemas/trade-application";

import { addActivity, createContact } from "./contact-service";

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
