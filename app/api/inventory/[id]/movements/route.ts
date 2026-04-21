import { NextRequest, NextResponse } from "next/server";

import { getMovements } from "@/lib/services/inventory-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { searchParams } = request.nextUrl;
  const page = Number(searchParams.get("page") || "1");

  const result = await getMovements(id, page);
  return NextResponse.json({ data: result });
}
