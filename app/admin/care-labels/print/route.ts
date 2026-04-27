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

  const pdf = await renderCareLabelsPdf(specs, mode, side);

  const baseName = sku ? sku.toLowerCase() : "all-care-labels";
  const fileName = `${baseName}-${side}-${mode}.pdf`;

  return new Response(Buffer.from(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${fileName}"`,
    },
  });
}
