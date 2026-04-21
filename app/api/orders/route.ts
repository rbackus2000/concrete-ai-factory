import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/shared";
import { getSystemActor } from "@/lib/auth/session";
import { orderCreateSchema } from "@/lib/schemas/order";
import { listOrders, createOrder } from "@/lib/services/order-service";
import type { OrderStatusType } from "@/lib/schemas/order";

export const dynamic = "force-dynamic";

function getActor(request: NextRequest) {
  return authenticateRequest(request.headers.get("authorization")) ?? getSystemActor();
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status") as OrderStatusType | null;
  const search = searchParams.get("search") || undefined;
  const orders = await listOrders({ status: status || undefined, search });
  return NextResponse.json({ data: orders });
}

export async function POST(request: NextRequest) {
  const actor = getActor(request);
  const body = await request.json();
  const parsed = orderCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", message: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const order = await createOrder(parsed.data, actor);
    return NextResponse.json({ data: order }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create order";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
