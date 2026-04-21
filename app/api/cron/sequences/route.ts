import { NextRequest, NextResponse } from "next/server";
import { processSequenceEmails } from "@/lib/services/marketing-service";

export async function POST(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const sentCount = await processSequenceEmails();
    return NextResponse.json({ data: { sentCount } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cron failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Also support GET for Vercel Cron
export async function GET(request: NextRequest) {
  return POST(request);
}
