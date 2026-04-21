import { NextRequest, NextResponse } from "next/server";
import { processUnsubscribe, processResubscribe } from "@/lib/services/marketing-service";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  try {
    const result = await processUnsubscribe(token);
    if (!result) {
      return NextResponse.json({ error: "Invalid token" }, { status: 404 });
    }
    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to unsubscribe";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  try {
    const result = await processResubscribe(token);
    if (!result) {
      return NextResponse.json({ error: "Invalid token" }, { status: 404 });
    }
    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to resubscribe";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
