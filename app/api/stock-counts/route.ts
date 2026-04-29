import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/shared";
import { getSystemActor } from "@/lib/auth/session";
import { startCountSchema } from "@/lib/schemas/inventory";
import { listStockCounts, startStockCount } from "@/lib/services/stock-count-service";

async function getActor(request: NextRequest) {
  return (await authenticateRequest(request)) ?? getSystemActor();
}

export async function GET() {
  const counts = await listStockCounts();
  return NextResponse.json({ data: counts });
}

export async function POST(request: NextRequest) {
  const actor = await getActor(request);
  const body = await request.json();
  const parsed = startCountSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", message: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const count = await startStockCount(parsed.data.scope, parsed.data.category, actor);
    return NextResponse.json({ data: count }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to start count";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
