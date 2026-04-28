import { NextResponse } from "next/server";

import { setTradeSessionCookie } from "@/lib/auth/trade-session";
import { consumeLoginToken } from "@/lib/services/trade-member-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const from = url.searchParams.get("from");

  if (!token) {
    return NextResponse.redirect(new URL("/trade/portal/login?error=missing-token", url));
  }

  const member = await consumeLoginToken(token);
  if (!member) {
    return NextResponse.redirect(new URL("/trade/portal/login?error=invalid-token", url));
  }

  await setTradeSessionCookie(member.id);

  // Redirect to where they were trying to go, defaulting to dashboard.
  const dest = from && from.startsWith("/trade/portal") ? from : "/trade/portal";
  return NextResponse.redirect(new URL(dest, url));
}
