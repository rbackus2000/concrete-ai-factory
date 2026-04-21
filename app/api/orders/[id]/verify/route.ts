import { NextRequest, NextResponse } from "next/server";
import { verifyLineItemSchema } from "@/lib/schemas/order";
import { verifyLineItem } from "@/lib/services/order-service";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await params; // consume params
  const body = await request.json();
  const parsed = verifyLineItemSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", message: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const item = await verifyLineItem(parsed.data.lineItemId, parsed.data.qtyScanned);
    return NextResponse.json({ data: item });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to verify";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
