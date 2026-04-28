import { z } from "zod";

import { getSystemActor } from "@/lib/auth/session";
import { sendSampleRequestAdminAlert } from "@/lib/services/postmark-service";
import type { TradeMemberRecord } from "@/lib/services/trade-member-service";

import { addActivity } from "./contact-service";
import { createOrder } from "./order-service";

import { ActivityType } from "@prisma/client";

export const sampleRequestSchema = z.object({
  shipToName: z.string().min(1, "Recipient name required").max(120),
  shipToAddress1: z.string().min(1, "Address required").max(200),
  shipToAddress2: z.string().max(200).optional().or(z.literal("")),
  shipToCity: z.string().min(1, "City required").max(80),
  shipToState: z.string().min(1, "State required").max(80),
  shipToZip: z.string().min(3, "Postal code required").max(20),
  shipToCountry: z.string().max(80).default("US"),
  notes: z.string().max(1000).optional().or(z.literal("")),
});

export type SampleRequestInput = z.infer<typeof sampleRequestSchema>;

function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

/**
 * Create a $0 internal order for a trade-member sample box and email
 * the ops owner so the shop floor can pull and pack the request.
 *
 * The order shows up in the standard /orders queue with the
 * production note flagging it as a trade sample request.
 */
export async function submitSampleRequest(
  member: TradeMemberRecord,
  input: SampleRequestInput,
): Promise<{ orderNumber: string; orderId: string; alertSent: boolean }> {
  const actor = getSystemActor();

  const order = await createOrder(
    {
      contactId: member.linkedContactId ?? undefined,
      shipToName: input.shipToName,
      shipToCompany: member.firmName,
      shipToAddress1: input.shipToAddress1,
      shipToAddress2: input.shipToAddress2 || "",
      shipToCity: input.shipToCity,
      shipToState: input.shipToState,
      shipToZip: input.shipToZip,
      shipToCountry: input.shipToCountry || "US",
      productionNotes: `[Trade sample request] ${member.firmName} (${member.email}). Pull a finish sample box — every Classic & Woodform color and the four sealer finishes. ${input.notes ? "Member notes: " + input.notes : ""}`,
      packingNotes: "Sample box — no invoice, no payment.",
      lineItems: [
        {
          name: "Trade Finish Sample Box",
          description: "Every Classic & Woodform color + four sealer finishes. Free for trade members.",
          imageUrl: "",
          sku: "TRADE-SAMPLE-BOX",
          barcode: "",
          quantity: 1,
          unitPrice: 0,
          lineTotal: 0,
          sortOrder: 0,
        },
      ],
      orderTotal: 0,
    },
    actor,
  );

  // Mirror the request as a CRM activity on the linked contact.
  if (member.linkedContactId) {
    await addActivity(
      member.linkedContactId,
      ActivityType.NOTE,
      `Sample box requested via trade portal. Order ${order.orderNumber} created ($0). Ship to:\n${input.shipToName}\n${input.shipToAddress1}\n${input.shipToAddress2 || ""}\n${input.shipToCity}, ${input.shipToState} ${input.shipToZip}${input.notes ? "\n\nMember notes:\n" + input.notes : ""}`,
      actor.username,
    );
  }

  let alertSent = false;
  try {
    await sendSampleRequestAdminAlert({
      member: {
        email: member.email,
        firmName: member.firmName,
        contactName: member.contactName,
      },
      shipTo: {
        name: input.shipToName,
        address1: input.shipToAddress1,
        address2: input.shipToAddress2 || null,
        city: input.shipToCity,
        state: input.shipToState,
        zip: input.shipToZip,
        country: input.shipToCountry || "US",
      },
      notes: input.notes || null,
      orderNumber: order.orderNumber,
      contactDetailUrl: `${getAppUrl()}/orders/${order.id}`,
    });
    alertSent = true;
  } catch (err) {
    console.error("[trade-portal/samples] admin alert failed", err);
  }

  return { orderNumber: order.orderNumber, orderId: order.id, alertSent };
}
