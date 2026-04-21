import { NextRequest, NextResponse } from "next/server";
import { recordOpen } from "@/lib/services/marketing-service";

// 1x1 transparent GIF
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  // Fire-and-forget — don't block pixel response
  recordOpen(token).catch((err) => console.error("Failed to record open:", err));

  return new NextResponse(PIXEL, {
    headers: {
      "Content-Type": "image/gif",
      "Content-Length": String(PIXEL.length),
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
