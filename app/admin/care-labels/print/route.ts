import { NextRequest } from "next/server";

import { requireAdminSession } from "@/lib/auth/session";
import {
  CARE_LABEL_SPECS,
  getCareLabelBySku,
  renderCareLabelsPdf,
  type LabelMode,
  type LabelSide,
  type LabelSpec,
} from "@/lib/services/care-label-pdf-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  await requireAdminSession();

  const { searchParams } = new URL(req.url);
  const mode = (searchParams.get("mode") ?? "single") as LabelMode;
  const side = (searchParams.get("side") ?? "front") as LabelSide;
  const sku = searchParams.get("sku");

  let specs: LabelSpec[];
  if (sku) {
    const single = getCareLabelBySku(sku);
    if (!single) {
      return new Response(`Unknown care SKU: ${sku}`, { status: 404 });
    }
    specs = [single];
  } else {
    specs = CARE_LABEL_SPECS;
  }

  const pdf = renderCareLabelsPdf(specs, mode, side);

  const baseName = sku ? sku.toLowerCase() : "all-care-labels";
  const fileName = `${baseName}-${side}-${mode}.pdf`;

  // The Buffer.subarray gives us a Uint8Array-compatible view that satisfies
  // Response's BodyInit type without an extra copy.
  return new Response(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${fileName}"`,
    },
  });
}
