import { NextResponse } from "next/server";

import { getTradeSession } from "@/lib/auth/trade-session";
import { renderTradeSpecSheet } from "@/lib/services/trade-spec-sheet-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ skuCode: string }> },
) {
  const member = await getTradeSession();
  if (!member) {
    return new NextResponse("Sign in required.", { status: 401 });
  }

  const { skuCode } = await params;

  let exported;
  try {
    exported = await renderTradeSpecSheet({
      skuCode,
      tradeDiscountPct: member.tradeDiscountPct,
    });
  } catch (err) {
    console.error("[trade-portal/spec-sheets] render failed", err);
    return new NextResponse(
      "Spec sheet could not be rendered. Please email trade@backusdesignco.com.",
      { status: 500 },
    );
  }

  if (!exported) {
    return new NextResponse(`No active SKU with code ${skuCode}.`, { status: 404 });
  }

  return new NextResponse(new Uint8Array(exported.content), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${exported.filename}"`,
      // Defeat browser PDF cache — every request gets a fresh render so
      // layout fixes show up immediately without users having to clear cache.
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  });
}
