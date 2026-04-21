import { NextRequest, NextResponse } from "next/server";

import { signQuoteSchema } from "@/lib/schemas/quote";
import { getQuote, signQuote } from "@/lib/services/quote-service";
import {
  sendSignedConfirmationEmail,
  sendSignedOwnerNotification,
} from "@/lib/services/postmark-service";
import { addActivity } from "@/lib/services/contact-service";
import { unenrollFromTriggers } from "@/lib/services/marketing-service";

// Public endpoint — no auth required
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const parsed = signQuoteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", message: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Look up the quote to get the publicToken
  const existingQuote = await getQuote(id);
  if (!existingQuote) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }

  const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip");
  const userAgent = request.headers.get("user-agent");

  try {
    const signedQuote = await signQuote({
      token: existingQuote.publicToken,
      signerName: parsed.data.signerName,
      signatureData: parsed.data.signatureData,
      ip,
      userAgent,
      selectedItems: parsed.data.selectedItems,
    });

    const selectedItems = signedQuote.lineItems.filter(
      (item) => !item.isOptional || item.isSelected,
    );

    // Send confirmation to customer
    sendSignedConfirmationEmail({
      to: signedQuote.contactEmail,
      quoteNumber: signedQuote.quoteNumber,
      contactName: signedQuote.contactName,
      total: signedQuote.total,
      itemCount: selectedItems.length,
    }).then(() => {
      // Log email activity on the linked contact
      if (existingQuote.contactId) {
        addActivity(
          existingQuote.contactId,
          "EMAIL",
          `Signature confirmation email sent to ${signedQuote.contactEmail} — ${signedQuote.quoteNumber}`,
          "system",
          JSON.stringify({ quoteId: signedQuote.id, quoteNumber: signedQuote.quoteNumber, emailType: "signed_confirmation", recipient: signedQuote.contactEmail }),
        ).catch(() => {});
      }
    }).catch((err) => console.error("Failed to send signed confirmation:", err));

    // Notify owner
    sendSignedOwnerNotification({
      quoteId: signedQuote.id,
      quoteNumber: signedQuote.quoteNumber,
      signerName: parsed.data.signerName,
      contactEmail: signedQuote.contactEmail,
      contactPhone: signedQuote.contactPhone,
      companyName: signedQuote.companyName,
      total: signedQuote.total,
      itemCount: selectedItems.length,
      signedAt: new Date().toLocaleString("en-US", {
        dateStyle: "full",
        timeStyle: "short",
      }),
    }).catch((err) => console.error("Failed to send owner notification:", err));

    // Unenroll from all quote-related sequences (fire-and-forget)
    if (existingQuote.contactId) {
      unenrollFromTriggers(
        existingQuote.contactId,
        ["QUOTE_SENT", "QUOTE_VIEWED", "QUOTE_UNOPENED_3DAY", "QUOTE_VIEWED_UNSIGNED_2DAY"],
        "SIGNED",
      ).catch(() => {});
    }

    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to sign";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
