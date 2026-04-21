import { NextRequest, NextResponse } from "next/server";
import { getRatesSchema } from "@/lib/schemas/order";
import { easypost } from "@/lib/easypost";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await params;
  const body = await request.json();
  const parsed = getRatesSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", message: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const client = easypost.client;
    const { toAddress, parcel } = parsed.data;

    const shipment = await client.Shipment.create({
      from_address: {
        name: process.env.SHIP_FROM_NAME || "Robert Backus",
        company: process.env.SHIP_FROM_COMPANY || "RB Architecture Concrete Studio",
        street1: process.env.SHIP_FROM_STREET1 || "123 Main St",
        city: process.env.SHIP_FROM_CITY || "Dallas",
        state: process.env.SHIP_FROM_STATE || "TX",
        zip: process.env.SHIP_FROM_ZIP || "75201",
        country: "US",
        phone: process.env.SHIP_FROM_PHONE || "5555555555",
      },
      to_address: {
        name: toAddress.name || "",
        company: toAddress.company || "",
        street1: toAddress.street1,
        street2: toAddress.street2 || "",
        city: toAddress.city,
        state: toAddress.state,
        zip: toAddress.zip,
        country: toAddress.country || "US",
      },
      parcel: {
        weight: parcel.weightOz,
        length: parcel.length || undefined,
        width: parcel.width || undefined,
        height: parcel.height || undefined,
      },
    });

    const rates = (shipment.rates || [] as any[]) // EasyPost untyped
      .map((rate: any) => ({
        id: rate.id as string,
        carrier: rate.carrier as string,
        service: rate.service as string,
        rate: parseFloat(rate.rate as string),
        deliveryDays: rate.delivery_days as number | null,
        deliveryDate: rate.delivery_date as string | null,
        currency: rate.currency as string,
      }))
      .sort((a: { rate: number }, b: { rate: number }) => a.rate - b.rate);

    return NextResponse.json({
      data: {
        shipmentId: shipment.id,
        rates,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch rates";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
