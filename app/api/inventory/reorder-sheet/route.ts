import { NextResponse } from "next/server";

import { getReorderSheet } from "@/lib/services/inventory-service";

export async function GET() {
  const data = await getReorderSheet();
  return NextResponse.json({ data });
}
