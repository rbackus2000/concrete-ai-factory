import { NextResponse } from "next/server";
import { getARAgingData } from "@/lib/services/reporting-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getARAgingData();
    return NextResponse.json({ data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch AR aging data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
