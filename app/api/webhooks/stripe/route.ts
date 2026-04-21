import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";

import { constructWebhookEvent, getChargeDetails } from "@/lib/services/stripe-service";
import {
  findInvoiceByPaymentIntent,
  recordPayment,
  getInvoice,
} from "@/lib/services/invoice-service";
import { deductStockForInvoice } from "@/lib/services/inventory-service";
import {
  sendPaymentConfirmationEmail,
  sendPaymentOwnerNotification,
} from "@/lib/services/postmark-service";
import { addActivity } from "@/lib/services/contact-service";
import { getSystemActor } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = constructWebhookEvent(body, signature);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook verification failed";
    console.error("Stripe webhook verification failed:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object as Stripe.PaymentIntent;
    const invoiceId = pi.metadata?.invoiceId;

    if (!invoiceId) {
      // Not one of our invoice payments
      return NextResponse.json({ received: true });
    }

    try {
      const chargeDetails = await getChargeDetails(pi.id);
      const actor = getSystemActor();

      const result = await recordPayment(
        invoiceId,
        {
          amount: chargeDetails.amount,
          method: "STRIPE_CARD",
          stripePaymentIntentId: pi.id,
          stripeChargeId: chargeDetails.chargeId ?? undefined,
          last4: chargeDetails.last4 ?? undefined,
          brand: chargeDetails.brand ?? undefined,
        },
        actor,
      );

      const invoice = await getInvoice(invoiceId);
      if (invoice) {
        sendPaymentConfirmationEmail({
          to: invoice.contactEmail,
          invoiceNumber: invoice.invoiceNumber,
          contactName: invoice.contactName,
          amountPaid: chargeDetails.amount,
          paymentMethod: "STRIPE_CARD",
          isPaidInFull: result.isPaidInFull,
          remainingBalance: result.newAmountDue,
        }).catch((err) => console.error("Failed to send payment confirmation:", err));

        sendPaymentOwnerNotification({
          invoiceId,
          invoiceNumber: invoice.invoiceNumber,
          customerName: invoice.contactName,
          customerEmail: invoice.contactEmail,
          amountPaid: chargeDetails.amount,
          paymentMethod: "STRIPE_CARD",
          last4: chargeDetails.last4,
          brand: chargeDetails.brand,
          isPaidInFull: result.isPaidInFull,
          remainingBalance: result.newAmountDue,
        }).catch((err) => console.error("Failed to send owner notification:", err));

        if (invoice.contactId) {
          await addActivity(
            invoice.contactId,
            "PAYMENT_RECEIVED",
            `Stripe payment of $${chargeDetails.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })} received for invoice ${invoice.invoiceNumber}${result.isPaidInFull ? " — PAID IN FULL" : ""}`,
            "system",
            JSON.stringify({ invoiceId, invoiceNumber: invoice.invoiceNumber, amount: chargeDetails.amount }),
          );
        }

        // Deduct inventory when invoice is paid in full
        if (result.isPaidInFull) {
          deductStockForInvoice(
            invoiceId,
            invoice.invoiceNumber,
            invoice.lineItems.map((li) => ({ skuId: li.skuId, quantity: li.quantity, name: li.name })),
            actor,
          ).catch((err) => console.error("Failed to deduct stock for invoice:", err));
        }
      }
    } catch (err) {
      console.error("Stripe webhook payment processing error:", err);
    }
  }

  if (event.type === "payment_intent.payment_failed") {
    const pi = event.data.object as Stripe.PaymentIntent;
    const invoiceId = pi.metadata?.invoiceId;
    if (invoiceId) {
      const { prisma } = await import("@/lib/db");
      await prisma.invoiceEvent.create({
        data: {
          invoiceId,
          event: "PAYMENT_FAILED",
          metadata: JSON.stringify({ paymentIntentId: pi.id, error: pi.last_payment_error?.message }),
        },
      });
    }
  }

  return NextResponse.json({ received: true });
}
