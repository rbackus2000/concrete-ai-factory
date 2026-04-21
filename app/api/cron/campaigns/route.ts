import { NextRequest, NextResponse } from "next/server";
import { processScheduledCampaigns } from "@/lib/services/marketing-service";

export async function POST(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const processed = await processScheduledCampaigns();
    return NextResponse.json({ data: { processed } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cron failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
