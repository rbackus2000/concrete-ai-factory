import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { processTrackingUpdate } from "@/lib/services/order-service";
import { sendOrderDeliveredEmail, sendOrderExceptionOwnerEmail } from "@/lib/services/postmark-service";
import { prisma } from "@/lib/db";

function verifyWebhook(body: string, signature: string | null): boolean {
  const secret = process.env.EASYPOST_WEBHOOK_SECRET;
  if (!secret) return true; // Skip verification if no secret configured
  if (!signature) return false;

  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(body);
  const expected = hmac.digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hmac-signature");

  if (!verifyWebhook(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  try {
    const payload = JSON.parse(rawBody);
    const { description, result } = payload;

    if (description !== "tracker.updated" || !result) {
      return NextResponse.json({ ok: true });
    }

    const trackerId = result.id;
    const trackingStatus = result.status;
    const trackingDetails = result.tracking_details || [];
    const estDeliveryDate = result.est_delivery_date;

    const order = await processTrackingUpdate(
      trackerId,
      trackingStatus,
      trackingDetails,
      estDeliveryDate,
    );

    if (!order) {
      return NextResponse.json({ ok: true, message: "No matching order" });
    }

    // Send emails for key status changes
    const fullOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: { contact: { select: { name: true, email: true } } },
    });

    if (fullOrder?.contact?.email) {
      if (trackingStatus === "delivered") {
        sendOrderDeliveredEmail({
          to: fullOrder.contact.email,
          orderNumber: fullOrder.orderNumber,
          contactName: fullOrder.contact.name,
        }).catch((err) => console.error("Failed to send delivered email:", err));
      }

      if (trackingStatus === "failure" || trackingStatus === "return_to_sender") {
        const lastDetail = trackingDetails[trackingDetails.length - 1];
        sendOrderExceptionOwnerEmail({
          orderId: fullOrder.id,
          orderNumber: fullOrder.orderNumber,
          contactName: fullOrder.contact.name,
          contactEmail: fullOrder.contact.email,
          trackingNumber: fullOrder.trackingNumber,
          carrier: fullOrder.carrier,
          exceptionMessage: lastDetail?.message || "Shipping exception",
        }).catch((err) => console.error("Failed to send exception email:", err));
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("EasyPost webhook error:", err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
