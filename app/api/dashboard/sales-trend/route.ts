import { NextResponse } from "next/server";
import { getSalesTrendData } from "@/lib/services/reporting-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getSalesTrendData();
    return NextResponse.json({ data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch sales trend data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
