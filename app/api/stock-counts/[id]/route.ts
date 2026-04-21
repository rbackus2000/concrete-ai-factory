import { NextRequest, NextResponse } from "next/server";

import { getStockCount, updateCountLine } from "@/lib/services/stock-count-service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const count = await getStockCount(id);
  if (!count) {
    return NextResponse.json({ error: "Count not found" }, { status: 404 });
  }
  return NextResponse.json({ data: count });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // Update individual count lines
  const body = await request.json();
  const { lineId, countedQty } = body as { lineId: string; countedQty: number };

  try {
    const line = await updateCountLine(lineId, countedQty);
    return NextResponse.json({ data: line });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update count";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
