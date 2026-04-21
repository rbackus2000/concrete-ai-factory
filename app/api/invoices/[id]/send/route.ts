import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/shared";
import { getSystemActor } from "@/lib/auth/session";
import { getInvoice, markInvoiceSent } from "@/lib/services/invoice-service";
import { sendInvoiceSentEmail } from "@/lib/services/postmark-service";
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

  const existing = await getInvoice(id);
  if (!existing) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  // 1. Send email FIRST — if this fails, invoice stays in current status
  const dueDate = existing.dueDate.toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  try {
    await sendInvoiceSentEmail({
      to: existing.contactEmail,
      invoiceNumber: existing.invoiceNumber,
      contactName: existing.contactName,
      total: existing.total,
      amountDue: existing.amountDue,
      dueDate,
      publicToken: existing.publicToken,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Email delivery failed";
    return NextResponse.json(
      { error: `Failed to send email: ${message}. Invoice was NOT marked as sent.` },
      { status: 502 },
    );
  }

  // 2. Email confirmed delivered — now mark invoice as SENT
  try {
    const invoice = await markInvoiceSent(id, actor);

    // Log email activity (best-effort, non-blocking)
    if (invoice.contactId) {
      addActivity(
        invoice.contactId,
        "EMAIL",
        `Invoice email sent to ${invoice.contactEmail} — ${invoice.invoiceNumber}`,
        actor.id,
        JSON.stringify({ invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, emailType: "invoice_sent" }),
      ).catch(() => {});
    }

    // Enroll in invoice sequence (fire-and-forget)
    if (invoice.contactId) {
      autoEnroll(invoice.contactId, "INVOICE_SENT", invoice.id).catch(() => {});
    }

    return NextResponse.json({ data: invoice });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update invoice";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
