import { NextRequest, NextResponse } from "next/server";
import type { POStatus } from "@prisma/client";

import { authenticateRequest } from "@/lib/auth/shared";
import { getSystemActor } from "@/lib/auth/session";
import { purchaseOrderFormSchema } from "@/lib/schemas/inventory";
import {
  listPurchaseOrders,
  createPurchaseOrder,
} from "@/lib/services/purchase-order-service";

function getActor(request: NextRequest) {
  return authenticateRequest(request.headers.get("authorization")) ?? getSystemActor();
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const pos = await listPurchaseOrders({
    status: (searchParams.get("status") as POStatus) || undefined,
    search: searchParams.get("search") || undefined,
  });

  return NextResponse.json({ data: pos });
}

export async function POST(request: NextRequest) {
  const actor = getActor(request);
  const body = await request.json();
  const parsed = purchaseOrderFormSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", message: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const po = await createPurchaseOrder(parsed.data, actor);
    return NextResponse.json({ data: po }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create PO";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
