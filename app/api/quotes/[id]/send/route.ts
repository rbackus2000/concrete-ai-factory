import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/shared";
import { getSystemActor } from "@/lib/auth/session";
import { getQuote, markQuoteSent } from "@/lib/services/quote-service";
import { sendQuoteSentEmail } from "@/lib/services/postmark-service";
import { addActivity } from "@/lib/services/contact-service";
import { autoEnroll } from "@/lib/services/marketing-service";

function getActor(request: NextRequest) {
  return authenticateRequest(request.headers.get("authorization")) ?? getSystemActor();
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = getActor(request);
  const { id } = await params;

  const existing = await getQuote(id);
  if (!existing) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }

  // 1. Send email FIRST — if this fails, quote stays in current status
  try {
    await sendQuoteSentEmail({
      to: existing.contactEmail,
      quoteNumber: existing.quoteNumber,
      contactName: existing.contactName,
      total: existing.total,
      publicToken: existing.publicToken,
      validUntil: existing.validUntil
        ? existing.validUntil.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Email delivery failed";
    return NextResponse.json(
      { error: `Failed to send email: ${message}. Quote was NOT marked as sent.` },
      { status: 502 },
    );
  }

  // 2. Email confirmed delivered — now mark quote as SENT
  try {
    const quote = await markQuoteSent(id, actor);

    // Log email activity (best-effort, non-blocking)
    if (quote.contactId) {
      addActivity(
        quote.contactId,
        "EMAIL",
        `Quote email sent to ${quote.contactEmail} — ${quote.quoteNumber} ($${quote.total.toLocaleString("en-US", { minimumFractionDigits: 2 })})`,
        actor.id,
        JSON.stringify({ quoteId: quote.id, quoteNumber: quote.quoteNumber, emailType: "quote_sent", recipient: quote.contactEmail }),
      ).catch(() => {});
    }

    // Enroll contact in quote follow-up sequence (fire-and-forget)
    if (quote.contactId) {
      autoEnroll(quote.contactId, "QUOTE_SENT", quote.id).catch(() => {});
    }

    return NextResponse.json({ data: quote });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
