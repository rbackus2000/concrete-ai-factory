import { NextResponse } from "next/server";
import { getInventoryHealthData } from "@/lib/services/reporting-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getInventoryHealthData();
    return NextResponse.json({ data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch inventory health";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
