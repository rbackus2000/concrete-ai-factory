import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { authenticateRequest, getAuthHeaderNames, isAdminRoute } from "@/lib/auth/shared";
import {
  TRADE_SESSION_COOKIE,
  verifyTradeSessionCookie,
} from "@/lib/auth/trade-session";

const PUBLIC_FILE = /\.(.*)$/;

// Trade portal paths the public can hit without a session cookie.
// Everything else under /trade/portal requires a valid session.
const TRADE_PORTAL_PUBLIC_PATHS = new Set<string>([
  "/trade/portal/login",
  "/trade/portal/check-email",
  "/trade/portal/verify",
  "/trade/portal/sign-out",
]);

function unauthorizedResponse() {
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Concrete AI Factory"',
    },
  });
}

function isTradePortalRoute(pathname: string): boolean {
  return pathname === "/trade/portal" || pathname.startsWith("/trade/portal/");
}

function isTradePortalPublic(pathname: string): boolean {
  return TRADE_PORTAL_PUBLIC_PATHS.has(pathname);
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

  // ── Trade portal: cookie-based auth, NOT Basic Auth ──
  if (isTradePortalRoute(pathname)) {
    if (isTradePortalPublic(pathname)) {
      return NextResponse.next();
    }
    const sessionCookie = request.cookies.get(TRADE_SESSION_COOKIE)?.value;
    const payload = await verifyTradeSessionCookie(sessionCookie);
    if (!payload) {
      const loginUrl = new URL("/trade/portal/login", request.url);
      // Preserve where they wanted to go so the login page can redirect back.
      if (pathname !== "/trade/portal") {
        loginUrl.searchParams.set("from", pathname);
      }
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // ── Internal staff: Basic Auth ──
  const session = authenticateRequest(request.headers.get("authorization"));

  if (!session) {
    return unauthorizedResponse();
  }

  if (isAdminRoute(pathname) && session.role !== "ADMIN") {
    return new NextResponse("Admin access is required.", {
      status: 403,
    });
  }

  const requestHeaders = new Headers(request.headers);
  const headerNames = getAuthHeaderNames();

  requestHeaders.set(headerNames.role, session.role);
  requestHeaders.set(headerNames.username, session.username);
  requestHeaders.set(headerNames.displayName, session.displayName);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ["/((?!api).*)"],
};
