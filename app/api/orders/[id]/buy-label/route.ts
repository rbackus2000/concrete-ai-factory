import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/shared";
import { getSystemActor } from "@/lib/auth/session";
import { buyLabelSchema } from "@/lib/schemas/order";
import { easypost } from "@/lib/easypost";
import { getOrder, updateOrderShipping, updateOrderStatus } from "@/lib/services/order-service";
import { sendOrderShippedEmail } from "@/lib/services/postmark-service";

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
  const parsed = buyLabelSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", message: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const client = easypost.client;
    const { rateId, easypostShipmentId, insure, declaredValue } = parsed.data;

    // Buy the label
    const shipment = await client.Shipment.buy(easypostShipmentId, rateId);

    // Add insurance if requested
    if (insure && declaredValue) {
      try {
        await client.Shipment.insure(easypostShipmentId, declaredValue);
      } catch {
        // Insurance is optional — don't fail the whole operation
      }
    }

    const label = shipment.postage_label as any; // EasyPost untyped
    const tracker = shipment.tracker as any; // EasyPost untyped

    // Update order with shipping info
    await updateOrderShipping(id, {
      carrier: shipment.selected_rate?.carrier as string || "",
      serviceLevel: shipment.selected_rate?.service as string || "",
      shippingRate: parseFloat(shipment.selected_rate?.rate as string || "0"),
      trackingNumber: shipment.tracking_code as string || "",
      labelUrl: label?.label_url as string || "",
      easypostShipmentId: shipment.id as string,
      easypostTrackerId: tracker?.id as string || undefined,
      insured: !!insure,
      insuranceAmount: insure ? declaredValue : undefined,
      shippingCost: parseFloat(shipment.selected_rate?.rate as string || "0"),
    });

    // Update status to LABEL_PURCHASED
    await updateOrderStatus(id, "LABEL_PURCHASED", actor);

    // Send shipping email to customer
    const order = await getOrder(id);
    if (order?.contact?.email) {
      const trackingUrl = `https://track.easypost.com/${shipment.tracking_code}`;
      sendOrderShippedEmail({
        to: order.contact.email,
        orderNumber: order.orderNumber,
        contactName: order.contact.name,
        carrier: shipment.selected_rate?.carrier as string || "",
        serviceLevel: shipment.selected_rate?.service as string || "",
        trackingNumber: shipment.tracking_code as string || "",
        trackingUrl,
        estimatedDelivery: null,
        items: order.lineItems.map((li) => ({
          name: li.name,
          quantity: li.quantity,
          imageUrl: li.imageUrl,
        })),
      }).catch((err) => console.error("Failed to send shipping email:", err));
    }

    return NextResponse.json({
      data: {
        labelUrl: label?.label_url || "",
        trackingNumber: shipment.tracking_code || "",
        carrier: shipment.selected_rate?.carrier || "",
        service: shipment.selected_rate?.service || "",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to buy label";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
