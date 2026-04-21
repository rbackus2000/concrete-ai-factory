import { NextRequest, NextResponse } from "next/server";
import { createReturnSchema } from "@/lib/schemas/order";
import { getOrder, createReturn } from "@/lib/services/order-service";
import { easypost } from "@/lib/easypost";
import { sendReturnLabelEmail } from "@/lib/services/postmark-service";
import { prisma } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const parsed = createReturnSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", message: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const order = await getOrder(id);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const ret = await createReturn(id, parsed.data.reason, parsed.data.notes);

    // Try to create return label via EasyPost
    if (order.easypostShipmentId) {
      try {
        const client = easypost.client;
        const returnShipment = await client.Shipment.create({
          from_address: {
            name: order.shipToName || "",
            company: order.shipToCompany || "",
            street1: order.shipToAddress1 || "",
            street2: order.shipToAddress2 || "",
            city: order.shipToCity || "",
            state: order.shipToState || "",
            zip: order.shipToZip || "",
            country: order.shipToCountry || "US",
          },
          to_address: {
            name: process.env.SHIP_FROM_NAME || "Robert Backus",
            company: process.env.SHIP_FROM_COMPANY || "RB Architecture Concrete Studio",
            street1: process.env.SHIP_FROM_STREET1 || "123 Main St",
            city: process.env.SHIP_FROM_CITY || "Dallas",
            state: process.env.SHIP_FROM_STATE || "TX",
            zip: process.env.SHIP_FROM_ZIP || "75201",
            country: "US",
            phone: process.env.SHIP_FROM_PHONE || "5555555555",
          },
          parcel: {
            weight: ((order.weightLbs || 0) * 16) + (order.weightOz || 0),
            length: order.dimLength || undefined,
            width: order.dimWidth || undefined,
            height: order.dimHeight || undefined,
          },
          is_return: true,
        });

        // Buy cheapest rate
        const rates = (returnShipment.rates || [] as any[]).sort(
          (a: any, b: any) =>
            parseFloat(a.rate as string) - parseFloat(b.rate as string),
        );

        if (rates.length > 0) {
          const boughtShipment = await client.Shipment.buy(
            returnShipment.id as string,
            rates[0].id as string,
          );

          const label = boughtShipment.postage_label as any; // EasyPost untyped
          const returnLabelUrl = (label?.label_url as string) || "";
          const returnTracking = (boughtShipment.tracking_code as string) || "";

          await prisma.orderReturn.update({
            where: { id: ret.id },
            data: {
              returnLabelUrl,
              trackingNumber: returnTracking,
              easypostReturnId: boughtShipment.id as string,
            },
          });

          // Send return label email
          if (order.contact?.email && returnLabelUrl) {
            sendReturnLabelEmail({
              to: order.contact.email,
              orderNumber: order.orderNumber,
              contactName: order.contact.name,
              reason: parsed.data.reason,
              returnLabelUrl,
            }).catch((err) => console.error("Failed to send return label email:", err));
          }
        }
      } catch (err) {
        console.error("Failed to create return label via EasyPost:", err);
      }
    }

    return NextResponse.json({ data: ret }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create return";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
