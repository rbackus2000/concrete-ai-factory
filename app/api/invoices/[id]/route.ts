import { NextRequest, NextResponse } from "next/server";

import { getInvoice } from "@/lib/services/invoice-service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const invoice = await getInvoice(id);

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  return NextResponse.json({ data: invoice });
}
