import { NextRequest, NextResponse } from "next/server";
import { updateOrderAddress } from "@/lib/services/order-service";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();

  try {
    const order = await updateOrderAddress(id, {
      shipToName: body.shipToName,
      shipToCompany: body.shipToCompany,
      shipToAddress1: body.shipToAddress1,
      shipToAddress2: body.shipToAddress2,
      shipToCity: body.shipToCity,
      shipToState: body.shipToState,
      shipToZip: body.shipToZip,
      shipToCountry: body.shipToCountry,
      addressVerified: false,
    });
    return NextResponse.json({ data: order });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update address";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
