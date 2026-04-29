import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getAuthHeaderNames, isAdminRoute } from "@/lib/auth/shared";
import { STAFF_SESSION_COOKIE, verifyStaffSessionCookie } from "@/lib/auth/staff-session";
import {
  TRADE_SESSION_COOKIE,
  verifyTradeSessionCookie,
} from "@/lib/auth/trade-session";

const PUBLIC_FILE = /\.(.*)$/;

// Trade portal paths the public can hit without a session cookie.
const TRADE_PORTAL_PUBLIC_PATHS = new Set<string>([
  "/trade/portal/login",
  "/trade/portal/check-email",
  "/trade/portal/verify",
  "/trade/portal/sign-out",
]);

// Staff paths anyone can hit (login screen + sign-out + the password
// change page that signed-in-but-must-change-password users need).
const STAFF_PUBLIC_PATHS = new Set<string>([
  "/login",
  "/account/password-change",
]);

function isTradePortalRoute(pathname: string): boolean {
  return pathname === "/trade/portal" || pathname.startsWith("/trade/portal/");
}
function isTradePortalPublic(pathname: string): boolean {
  return TRADE_PORTAL_PUBLIC_PATHS.has(pathname);
}
function isPublicStaffPath(pathname: string): boolean {
  return STAFF_PUBLIC_PATHS.has(pathname);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/q/") ||
    pathname.startsWith("/inv/") ||
    pathname.startsWith("/unsubscribe/") ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  // ── Trade portal: cookie-based auth, separate cookie ──
  if (isTradePortalRoute(pathname)) {
    const tradeHeaders = new Headers(request.headers);
    tradeHeaders.set("x-route-shell", "trade-portal");

    if (isTradePortalPublic(pathname)) {
      return NextResponse.next({ request: { headers: tradeHeaders } });
    }
    const sessionCookie = request.cookies.get(TRADE_SESSION_COOKIE)?.value;
    const payload = await verifyTradeSessionCookie(sessionCookie);
    if (!payload) {
      const loginUrl = new URL("/trade/portal/login", request.url);
      if (pathname !== "/trade/portal") {
        loginUrl.searchParams.set("from", pathname);
      }
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next({ request: { headers: tradeHeaders } });
  }

  // ── Internal staff: cookie-based auth ──
  if (isPublicStaffPath(pathname)) {
    // Pass pathname to root layout so it can render the chrome-less shell.
    const headers = new Headers(request.headers);
    headers.set("x-pathname", pathname);
    return NextResponse.next({ request: { headers } });
  }

  const staffCookie = request.cookies.get(STAFF_SESSION_COOKIE)?.value;
  const session = await verifyStaffSessionCookie(staffCookie);

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAdminRoute(pathname) && session.role !== "ADMIN") {
    return new NextResponse("Admin access is required.", { status: 403 });
  }

  // Forward identity to Server Components / Server Actions via headers.
  // The session payload carries everything getOptionalSession() needs,
  // so no DB call is required per request.
  const requestHeaders = new Headers(request.headers);
  const headerNames = getAuthHeaderNames();
  requestHeaders.set(headerNames.role, session.role);
  requestHeaders.set(headerNames.staffId, session.staffId);
  requestHeaders.set(headerNames.username, session.email);
  requestHeaders.set(headerNames.displayName, session.displayName);
  requestHeaders.set("x-pathname", pathname);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ["/((?!api).*)"],
};
