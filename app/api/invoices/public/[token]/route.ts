import { NextRequest, NextResponse } from "next/server";

import { getInvoiceByToken, trackInvoiceView } from "@/lib/services/invoice-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const invoice = await getInvoiceByToken(token);

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  // Track view
  const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip");
  await trackInvoiceView(token, ip);

  // Strip internal notes
  const { notes, ...publicData } = invoice;

  return NextResponse.json({ data: publicData });
}
