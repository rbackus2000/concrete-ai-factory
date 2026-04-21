import { NextResponse } from "next/server";

import { getLowStockItems } from "@/lib/services/inventory-service";

export async function GET() {
  const items = await getLowStockItems();
  return NextResponse.json({ data: items });
}
