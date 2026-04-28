"use server";

import { ActivityType } from "@prisma/client";

import { requireTradeMember } from "@/lib/auth/trade-session";
import { getSystemActor } from "@/lib/auth/session";
import { addActivity } from "@/lib/services/contact-service";
import { sendEmail } from "@/lib/services/postmark-service";
import {
  sampleRequestSchema,
  submitSampleRequest,
  type SampleRequestInput,
} from "@/lib/services/trade-portal-sample-service";

export async function submitSampleRequestAction(input: SampleRequestInput) {
  const member = await requireTradeMember();
  const parsed = sampleRequestSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join("; "));
  }
  return submitSampleRequest(member, parsed.data);
}

type QuoteRequestInput = {
  projectName: string;
  projectType: string;
  shipByDate: string;
  pieces: string;
  notes: string;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
}

export async function submitQuoteRequestAction(input: QuoteRequestInput) {
  const member = await requireTradeMember();
  if (!input.projectName.trim() || !input.pieces.trim()) {
    throw new Error("Project name and pieces are required");
  }

  const summary = [
    `Project: ${input.projectName}`,
    input.projectType ? `Type: ${input.projectType}` : "",
    input.shipByDate ? `Need by: ${input.shipByDate}` : "",
    "",
    "Pieces:",
    input.pieces,
    input.notes ? `\nNotes:\n${input.notes}` : "",
  ]
    .filter((l) => l !== null && l !== undefined)
    .join("\n");

  // Mirror as activity on the linked CRM contact.
  if (member.linkedContactId) {
    const actor = getSystemActor();
    await addActivity(
      member.linkedContactId,
      ActivityType.NOTE,
      `Quote request via trade portal:\n\n${summary}`,
      actor.username,
    );
  }

  // Email the sales desk with the request, applicant set as ReplyTo.
  try {
    const html = `
      <h2>Trade quote request — ${escapeHtml(member.firmName)}</h2>
      <p><strong>From:</strong> ${escapeHtml(member.contactName)} &lt;${escapeHtml(member.email)}&gt;<br>
         <strong>Trade discount:</strong> ${member.tradeDiscountPct}%</p>
      <hr>
      <p>${escapeHtml(summary)}</p>
    `;
    await sendEmail({
      to: process.env.OWNER_EMAIL ?? "robert@backusdesignco.com",
      subject: `[Trade quote] ${member.firmName} — ${input.projectName}`,
      htmlBody: html,
      from: "sales",
    });
  } catch (err) {
    console.error("[trade-portal/quotes] email failed", err);
    // Don't fail the user — the activity is recorded.
  }

  return { ok: true };
}
