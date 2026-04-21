import { NextRequest, NextResponse } from "next/server";

import { getItemsForLabels, backfillBarcodes } from "@/lib/services/inventory-service";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const idsParam = searchParams.get("ids");
  const ids = idsParam ? idsParam.split(",").filter(Boolean) : undefined;

  // Backfill any items missing barcodes
  await backfillBarcodes();

  const items = await getItemsForLabels(ids);
  return NextResponse.json({ data: items });
}
