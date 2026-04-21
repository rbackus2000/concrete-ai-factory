import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/shared";
import { getSystemActor } from "@/lib/auth/session";
import { stockAdjustmentSchema } from "@/lib/schemas/inventory";
import { adjustStock } from "@/lib/services/inventory-service";

function getActor(request: NextRequest) {
  return authenticateRequest(request.headers.get("authorization")) ?? getSystemActor();
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = getActor(request);
  const { id } = await params;
  const body = await request.json();
  const parsed = stockAdjustmentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", message: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const result = await adjustStock(id, parsed.data, actor);
    return NextResponse.json({ data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to adjust stock";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
