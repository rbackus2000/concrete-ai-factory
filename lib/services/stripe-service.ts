import Stripe from "stripe";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured.");
  return new Stripe(key);
}

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";
}

// ── Create Payment Link for Invoice ─────────────────────────

export async function createInvoicePaymentLink(input: {
  invoiceId: string;
  invoiceNumber: string;
  amountDue: number;
  customerEmail: string;
  customerName: string;
  publicToken: string;
}) {
  const stripe = getStripe();
  const amountCents = Math.round(input.amountDue * 100);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: input.customerEmail,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `Invoice ${input.invoiceNumber}`,
            description: `Payment for ${input.customerName}`,
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      },
    ],
    metadata: {
      invoiceId: input.invoiceId,
      invoiceNumber: input.invoiceNumber,
    },
    payment_intent_data: {
      metadata: {
        invoiceId: input.invoiceId,
        invoiceNumber: input.invoiceNumber,
      },
    },
    success_url: `${getAppUrl()}/inv/${input.publicToken}?paid=true`,
    cancel_url: `${getAppUrl()}/inv/${input.publicToken}`,
  });

  return {
    sessionId: session.id,
    sessionUrl: session.url!,
    paymentIntentId: typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null,
  };
}

// ── Verify Webhook ──────────────────────────────────────────

export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string,
): Stripe.Event {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not configured.");
  return stripe.webhooks.constructEvent(payload, signature, secret);
}

// ── Retrieve Charge Details ─────────────────────────────────

export async function getChargeDetails(paymentIntentId: string) {
  const stripe = getStripe();
  const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
    expand: ["latest_charge"],
  });

  const charge = pi.latest_charge as Stripe.Charge | null;
  return {
    chargeId: charge?.id ?? null,
    last4: (charge?.payment_method_details?.card?.last4) ?? null,
    brand: (charge?.payment_method_details?.card?.brand) ?? null,
    amount: pi.amount / 100,
  };
}
