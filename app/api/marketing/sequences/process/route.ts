import { NextRequest, NextResponse } from "next/server";
import { processSequenceEmails } from "@/lib/services/marketing-service";

export async function POST(request: NextRequest) {
  // Allow cron or internal calls
  const auth = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const sentCount = await processSequenceEmails();
    return NextResponse.json({ data: { sentCount } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Processing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
