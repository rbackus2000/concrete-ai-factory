import { NextRequest, NextResponse } from "next/server";
import { syncAllMaterialPrices } from "@/lib/services/price-sync-service";

export const dynamic = "force-dynamic";

const SYSTEM_ACTOR = {
  id: "system-cron",
  username: "system",
  displayName: "Price Sync (Cron)",
  role: "ADMIN" as const,
};

/**
 * POST /api/price-sync
 *
 * Triggers a bulk price sync for all materials with supplier product URLs.
 * Auth: CRON_SECRET header (for Vercel cron) or admin session.
 */
export async function POST(request: NextRequest) {
  // Verify authorization — Vercel cron sends CRON_SECRET automatically
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    // Authenticated via cron secret
  } else {
    // Fall back to checking basic auth from middleware
    const userRole = request.headers.get("x-caf-user-role");
    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const results = await syncAllMaterialPrices(SYSTEM_ACTOR);

  const updated = results.filter((r) => r.success && r.priceChanged).length;
  const unchanged = results.filter((r) => r.success && !r.priceChanged).length;
  const failed = results.filter((r) => !r.success).length;

  return NextResponse.json({
    success: true,
    syncedAt: new Date().toISOString(),
    summary: { total: results.length, updated, unchanged, failed },
    results,
  });
}
