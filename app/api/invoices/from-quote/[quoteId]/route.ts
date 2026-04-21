import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/shared";
import { getSystemActor } from "@/lib/auth/session";
import { createInvoiceFromQuote } from "@/lib/services/invoice-service";

function getActor(request: NextRequest) {
  return authenticateRequest(request.headers.get("authorization")) ?? getSystemActor();
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ quoteId: string }> },
) {
  const actor = getActor(request);
  const { quoteId } = await params;

  try {
    const invoice = await createInvoiceFromQuote(quoteId, actor);
    return NextResponse.json({ data: invoice }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create invoice";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
