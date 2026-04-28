import { NextResponse } from "next/server";

import { getTradeSession } from "@/lib/auth/trade-session";
import { exportBuildPacketPdf } from "@/lib/services/pdf-export-service";
import { findLatestBuildPacketForSku } from "@/lib/services/trade-portal-catalog-service";

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
  const outputId = await findLatestBuildPacketForSku(skuCode);
  if (!outputId) {
    return new NextResponse(`No design packet available for ${skuCode}.`, { status: 404 });
  }

  const exported = await exportBuildPacketPdf(outputId);
  if (!exported) {
    return new NextResponse("Packet PDF could not be rendered.", { status: 500 });
  }

  return new NextResponse(new Uint8Array(exported.content), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${exported.filename}"`,
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}
