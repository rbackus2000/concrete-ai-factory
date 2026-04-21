import { NextResponse } from "next/server";
import { getDashboardKPIs } from "@/lib/services/reporting-service";

export const dynamic = "force-dynamic";
export const revalidate = 300; // 5 min cache

export async function GET() {
  try {
    const data = await getDashboardKPIs();
    return NextResponse.json({ data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch KPIs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
