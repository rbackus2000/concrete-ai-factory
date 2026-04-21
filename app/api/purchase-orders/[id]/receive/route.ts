import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/shared";
import { getSystemActor } from "@/lib/auth/session";
import { receiveShipmentSchema } from "@/lib/schemas/inventory";
import { receiveShipment } from "@/lib/services/purchase-order-service";

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
  const parsed = receiveShipmentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", message: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const result = await receiveShipment(id, parsed.data, actor);
    return NextResponse.json({ data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to receive shipment";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
