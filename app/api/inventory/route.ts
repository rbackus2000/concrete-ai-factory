import { NextRequest, NextResponse } from "next/server";
import type { InventoryType } from "@prisma/client";

import { authenticateRequest } from "@/lib/auth/shared";
import { getSystemActor } from "@/lib/auth/session";
import { inventoryItemFormSchema } from "@/lib/schemas/inventory";
import { listInventoryItems, createInventoryItem } from "@/lib/services/inventory-service";

function getActor(request: NextRequest) {
  return authenticateRequest(request.headers.get("authorization")) ?? getSystemActor();
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const items = await listInventoryItems({
    type: (searchParams.get("type") as InventoryType) || undefined,
    search: searchParams.get("search") || undefined,
    status: searchParams.get("status") || undefined,
    category: searchParams.get("category") || undefined,
  });

  return NextResponse.json({ data: items });
}

export async function POST(request: NextRequest) {
  const actor = getActor(request);
  const body = await request.json();
  const parsed = inventoryItemFormSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", message: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const item = await createInventoryItem(parsed.data, actor);
    return NextResponse.json({ data: item }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create item";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
