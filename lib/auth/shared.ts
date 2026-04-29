import type { StaffRole } from "@/lib/schemas/domain";

// ── Internal staff session (post-migration) ──
// AppSession was originally HTTP-Basic + INTERNAL_AUTH_USERS_JSON. After
// the staff-users migration this now backs a real DB-backed account with
// six roles (see prisma/schema.prisma StaffRole). Legacy callers that
// only checked role === "ADMIN" continue to work unchanged because ADMIN
// remains one of the StaffRole values.

export type AppRole = StaffRole;

export type AppSession = {
  id: string;            // staffUser.id (cuid)
  username: string;      // email
  displayName: string;
  role: AppRole;
};

const ROLE_HEADER = "x-caf-user-role";
const USERNAME_HEADER = "x-caf-username";
const DISPLAY_NAME_HEADER = "x-caf-display-name";
const STAFF_ID_HEADER = "x-caf-staff-id";

export function getAuthHeaderNames() {
  return {
    role: ROLE_HEADER,
    username: USERNAME_HEADER,
    displayName: DISPLAY_NAME_HEADER,
    staffId: STAFF_ID_HEADER,
  };
}

export function isAdminRoute(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

/**
 * /api/* routes are NOT covered by the staff middleware (the matcher
 * excludes them). API route handlers should call this to gate themselves
 * against the same staff session cookie middleware checks for everything else.
 *
 * Returns an AppSession on success, or null. Callers typically chain
 * `?? getSystemActor()` for audit-actor purposes.
 *
 * Reads the staff session cookie from the request and verifies the HMAC.
 * No DB call.
 */
import { STAFF_SESSION_COOKIE, verifyStaffSessionCookie } from "./staff-session";

export async function authenticateRequest(
  request: Request,
): Promise<AppSession | null> {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${STAFF_SESSION_COOKIE}=([^;]+)`),
  );
  if (!match) return null;
  const value = decodeURIComponent(match[1]);
  const payload = await verifyStaffSessionCookie(value);
  if (!payload) return null;
  return {
    id: payload.staffId,
    username: payload.email,
    displayName: payload.displayName,
    role: payload.role,
  };
}
