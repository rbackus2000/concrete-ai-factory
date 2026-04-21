import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/shared";
import { getSystemActor } from "@/lib/auth/session";
import { duplicateQuote } from "@/lib/services/quote-service";

function getActor(request: NextRequest) {
  return authenticateRequest(request.headers.get("authorization")) ?? getSystemActor();
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = getActor(request);
  const { id } = await params;

  try {
    const quote = await duplicateQuote(id, actor);
    return NextResponse.json({ data: quote }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to duplicate";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
