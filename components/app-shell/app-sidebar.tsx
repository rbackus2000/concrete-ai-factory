import { getOptionalSession } from "@/lib/auth/session";

import { AppSidebarClient } from "./app-sidebar-client";

export async function AppSidebar() {
  const session = await getOptionalSession();

  return (
    <AppSidebarClient
      canAccessAdmin={session?.role === "ADMIN"}
      displayName={session?.displayName ?? "Internal user"}
      role={session?.role ?? "USER"}
    />
  );
}
