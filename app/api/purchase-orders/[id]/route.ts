import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/shared";
import { getSystemActor } from "@/lib/auth/session";
import {
  getPurchaseOrder,
  updatePurchaseOrder,
  cancelPurchaseOrder,
} from "@/lib/services/purchase-order-service";

function getActor(request: NextRequest) {
  return authenticateRequest(request.headers.get("authorization")) ?? getSystemActor();
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const po = await getPurchaseOrder(id);
  if (!po) {
    return NextResponse.json({ error: "PO not found" }, { status: 404 });
  }
  return NextResponse.json({ data: po });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = getActor(request);
  const { id } = await params;
  const body = await request.json();

  try {
    const po = await updatePurchaseOrder(id, body, actor);
    return NextResponse.json({ data: po });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update PO";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = getActor(request);
  const { id } = await params;

  try {
    await cancelPurchaseOrder(id, actor);
    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to cancel PO";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
