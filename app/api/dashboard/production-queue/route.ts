import { NextResponse } from "next/server";
import { getProductionQueueData } from "@/lib/services/reporting-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getProductionQueueData();
    return NextResponse.json({ data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch production queue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
