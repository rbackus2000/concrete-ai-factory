import { NextRequest, NextResponse } from "next/server";

import { getInventoryItemByBarcode } from "@/lib/services/inventory-service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ barcode: string }> },
) {
  const { barcode } = await params;
  const item = await getInventoryItemByBarcode(barcode);

  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  return NextResponse.json({ data: item });
}
