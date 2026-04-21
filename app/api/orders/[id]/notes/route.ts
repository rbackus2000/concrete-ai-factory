import { NextRequest, NextResponse } from "next/server";
import { updateOrderNotes } from "@/lib/services/order-service";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();

  try {
    const order = await updateOrderNotes(id, {
      productionNotes: body.productionNotes,
      packingNotes: body.packingNotes,
    });
    return NextResponse.json({ data: order });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update notes";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
