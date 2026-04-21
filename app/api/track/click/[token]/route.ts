import { NextRequest, NextResponse } from "next/server";
import { recordClick } from "@/lib/services/marketing-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const url = request.nextUrl.searchParams.get("url");

  // Record click (fire-and-forget)
  recordClick(token).catch((err) => console.error("Failed to record click:", err));

  if (url) {
    return NextResponse.redirect(decodeURIComponent(url));
  }

  return NextResponse.redirect(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");
}
