import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/shared";
import { getSystemActor } from "@/lib/auth/session";
import { syncInventoryFromMasters } from "@/lib/services/inventory-service";

function getActor(request: NextRequest) {
  return authenticateRequest(request.headers.get("authorization")) ?? getSystemActor();
}

export async function POST(request: NextRequest) {
  const actor = getActor(request);

  const result = await syncInventoryFromMasters(actor);

  return NextResponse.json({ data: result });
}
