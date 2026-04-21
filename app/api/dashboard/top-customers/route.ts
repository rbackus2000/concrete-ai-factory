import { NextResponse } from "next/server";
import { getTopCustomersData } from "@/lib/services/reporting-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getTopCustomersData();
    return NextResponse.json({ data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch top customers";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
