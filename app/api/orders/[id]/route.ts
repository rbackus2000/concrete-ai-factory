import { NextRequest, NextResponse } from "next/server";
import { getOrder } from "@/lib/services/order-service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  return NextResponse.json({ data: order });
}
