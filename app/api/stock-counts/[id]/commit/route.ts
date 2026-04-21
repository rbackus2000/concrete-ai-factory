import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/shared";
import { getSystemActor } from "@/lib/auth/session";
import { commitStockCount } from "@/lib/services/stock-count-service";

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
    const result = await commitStockCount(id, actor);
    return NextResponse.json({ data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to commit count";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
