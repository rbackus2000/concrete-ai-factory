import { headers } from "next/headers";

import { getAuthHeaderNames, type AppSession, type AppRole } from "./shared";

export type ActionActor = Pick<AppSession, "id" | "displayName" | "role" | "username">;

function buildSystemActor(): ActionActor {
  return {
    id: "system",
    username: "system",
    displayName: "System",
    role: "ADMIN",
  };
}

/**
 * Reads the staff session from request headers set by middleware.ts after
 * cookie verification. Returns null if no session is present.
 *
 * Middleware is the single source of truth for session validation — Server
 * Components / Server Actions just read the headers it sets.
 */
export async function getOptionalSession(): Promise<AppSession | null> {
  const headerStore = await headers();
  const headerNames = getAuthHeaderNames();
  const role = headerStore.get(headerNames.role);
  const username = headerStore.get(headerNames.username);
  const displayName = headerStore.get(headerNames.displayName);
  const staffId = headerStore.get(headerNames.staffId);

  if (!role || !username || !displayName || !staffId) return null;

  return {
    id: staffId,
    username,
    displayName,
    role: role as AppRole,
  } satisfies AppSession;
}

export async function requireSession(): Promise<AppSession> {
  const session = await getOptionalSession();
  if (!session) {
    throw new Error("Authentication required.");
  }
  return session;
}

export async function requireAdminSession(): Promise<AppSession> {
  const session = await requireSession();
  if (session.role !== "ADMIN") {
    throw new Error("Admin access is required for this action.");
  }
  return session;
}

export function getSystemActor() {
  return buildSystemActor();
}
