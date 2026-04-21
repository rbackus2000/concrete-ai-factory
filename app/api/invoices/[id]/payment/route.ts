import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/shared";
import { getSystemActor } from "@/lib/auth/session";
import { recordPaymentSchema } from "@/lib/schemas/invoice";
import { getInvoice, recordPayment } from "@/lib/services/invoice-service";
import { deductStockForInvoice } from "@/lib/services/inventory-service";
import { createOrderFromInvoice } from "@/lib/services/order-service";
import {
  sendPaymentConfirmationEmail,
  sendPaymentOwnerNotification,
} from "@/lib/services/postmark-service";
import { unenrollFromTriggers } from "@/lib/services/marketing-service";

function getActor(request: NextRequest) {
  return authenticateRequest(request.headers.get("authorization")) ?? getSystemActor();
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = getActor(request);
  const { id } = await params;
  const body = await request.json();
  const parsed = recordPaymentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", message: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const invoice = await getInvoice(id);
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const result = await recordPayment(
      id,
      { amount: parsed.data.amount, method: parsed.data.method, note: parsed.data.note, paidAt: parsed.data.paidAt },
      actor,
    );

    // Auto-create order when invoice is paid in full
    if (result.isPaidInFull) {
      createOrderFromInvoice(id, actor).catch((err) =>
        console.error("Failed to auto-create order from invoice:", err),
      );

      deductStockForInvoice(
        id,
        invoice.invoiceNumber,
        invoice.lineItems.map((li) => ({ skuId: li.skuId, quantity: li.quantity, name: li.name })),
        actor,
      ).catch((err) => console.error("Failed to deduct stock for invoice:", err));
    }

    // Unenroll from all invoice-related sequences when paid
    if (result.isPaidInFull && invoice.contactId) {
      unenrollFromTriggers(
        invoice.contactId,
        ["INVOICE_SENT", "INVOICE_OVERDUE", "INVOICE_OVERDUE_7DAY", "INVOICE_OVERDUE_14DAY"],
        "PAID",
      ).catch(() => {});
    }

    // Send emails (fire-and-forget for payment confirmations)
    sendPaymentConfirmationEmail({
      to: invoice.contactEmail,
      invoiceNumber: invoice.invoiceNumber,
      contactName: invoice.contactName,
      amountPaid: parsed.data.amount,
      paymentMethod: parsed.data.method,
      isPaidInFull: result.isPaidInFull,
      remainingBalance: result.newAmountDue,
    }).catch((err) => console.error("Failed to send payment confirmation:", err));

    sendPaymentOwnerNotification({
      invoiceId: id,
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.contactName,
      customerEmail: invoice.contactEmail,
      amountPaid: parsed.data.amount,
      paymentMethod: parsed.data.method,
      last4: null,
      brand: null,
      isPaidInFull: result.isPaidInFull,
      remainingBalance: result.newAmountDue,
    }).catch((err) => console.error("Failed to send owner notification:", err));

    return NextResponse.json({ data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to record payment";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
