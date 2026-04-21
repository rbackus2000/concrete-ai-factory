import { NextRequest, NextResponse } from "next/server";
import { getRevenueChartData } from "@/lib/services/reporting-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const period = request.nextUrl.searchParams.get("period") ?? "12m";
    const data = await getRevenueChartData(period);
    return NextResponse.json({ data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch revenue data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
