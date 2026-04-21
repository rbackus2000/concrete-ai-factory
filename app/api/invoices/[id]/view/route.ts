import { NextRequest, NextResponse } from "next/server";

import { trackInvoiceView } from "@/lib/services/invoice-service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip");

  await trackInvoiceView(id, ip);
  return NextResponse.json({ data: { success: true } });
}
