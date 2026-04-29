import { NextResponse } from "next/server";

import { clearStaffSessionCookie } from "@/lib/auth/staff-session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  await clearStaffSessionCookie();
  return NextResponse.redirect(new URL("/login", request.url));
}
