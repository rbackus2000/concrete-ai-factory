import { NextRequest, NextResponse } from "next/server";

import { getInvoice, storePaymentLink } from "@/lib/services/invoice-service";
import { createInvoicePaymentLink } from "@/lib/services/stripe-service";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const invoice = await getInvoice(id);

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  if (invoice.amountDue <= 0) {
    return NextResponse.json({ error: "Invoice is already paid" }, { status: 400 });
  }

  try {
    const result = await createInvoicePaymentLink({
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      amountDue: invoice.amountDue,
      customerEmail: invoice.contactEmail,
      customerName: invoice.contactName,
      publicToken: invoice.publicToken,
    });

    await storePaymentLink(
      invoice.id,
      result.sessionId,
      result.sessionUrl,
      result.paymentIntentId ?? undefined,
    );

    return NextResponse.json({ data: { url: result.sessionUrl } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create payment link";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
