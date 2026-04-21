import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { authenticateRequest, getAuthHeaderNames, isAdminRoute } from "@/lib/auth/shared";

const PUBLIC_FILE = /\.(.*)$/;

function unauthorizedResponse() {
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Concrete AI Factory"',
    },
  });
}

export function middleware(request: NextRequest) {
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
