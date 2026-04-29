import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/shared";
import { getSystemActor } from "@/lib/auth/session";
import { syncInventoryFromMasters } from "@/lib/services/inventory-service";

async function getActor(request: NextRequest) {
  return (await authenticateRequest(request)) ?? getSystemActor();
}

export async function POST(request: NextRequest) {
  const actor = await getActor(request);

  const result = await syncInventoryFromMasters(actor);

  return NextResponse.json({ data: result });
}
