import { headers } from "next/headers";

import {
  authenticateRequest,
  getAuthHeaderNames,
  type AppSession,
} from "./shared";

export type ActionActor = Pick<AppSession, "id" | "displayName" | "role" | "username">;

function buildSystemActor(): ActionActor {
  return {
    id: "system",
    username: "system",
    displayName: "System",
    role: "ADMIN",
  };
}

export async function getOptionalSession() {
  const headerStore = await headers();
  const headerNames = getAuthHeaderNames();
  const role = headerStore.get(headerNames.role);
  const username = headerStore.get(headerNames.username);
  const displayName = headerStore.get(headerNames.displayName);

  if (role && username && displayName) {
    return {
      id: username,
      username,
      displayName,
      role: role === "ADMIN" ? "ADMIN" : "USER",
    } satisfies AppSession;
  }

  return authenticateRequest(headerStore.get("authorization"));
}

export async function requireSession() {
  const session = await getOptionalSession();

  if (!session) {
    throw new Error("Authentication required.");
  }

  return session;
}

export async function requireAdminSession() {
  const session = await requireSession();

  if (session.role !== "ADMIN") {
    throw new Error("Admin access is required for this action.");
  }

  return session;
}

export function getSystemActor() {
  return buildSystemActor();
}
