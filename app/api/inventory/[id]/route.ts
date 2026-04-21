import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/shared";
import { getSystemActor } from "@/lib/auth/session";
import {
  getInventoryItem,
  updateInventoryItem,
  deactivateInventoryItem,
} from "@/lib/services/inventory-service";

function getActor(request: NextRequest) {
  return authenticateRequest(request.headers.get("authorization")) ?? getSystemActor();
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const item = await getInventoryItem(id);
  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }
  return NextResponse.json({ data: item });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = getActor(request);
  const { id } = await params;
  const body = await request.json();

  try {
    const item = await updateInventoryItem(id, body, actor);
    return NextResponse.json({ data: item });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update item";
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
    await deactivateInventoryItem(id, actor);
    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete item";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
