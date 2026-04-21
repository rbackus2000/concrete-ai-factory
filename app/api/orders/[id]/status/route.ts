import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/shared";
import { getSystemActor } from "@/lib/auth/session";
import { orderStatusUpdateSchema } from "@/lib/schemas/order";
import { updateOrderStatus, getOrder } from "@/lib/services/order-service";
import { autoEnroll, unenrollFromTriggers } from "@/lib/services/marketing-service";

function getActor(request: NextRequest) {
  return authenticateRequest(request.headers.get("authorization")) ?? getSystemActor();
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = getActor(request);
  const { id } = await params;
  const body = await request.json();
  const parsed = orderStatusUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", message: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const order = await updateOrderStatus(id, parsed.data.status, actor, parsed.data.notes);

    // Wire marketing enrollments for delivery
    if (parsed.data.status === "DELIVERED" && order.contactId) {
      autoEnroll(order.contactId, "ORDER_DELIVERED", order.id).catch(() => {});
    }

    // If new order placed, unenroll from dormant sequences
    if (order.contactId) {
      unenrollFromTriggers(
        order.contactId,
        ["CONTACT_DORMANT_60DAY", "CONTACT_DORMANT_90DAY"],
        "NEW_ORDER",
      ).catch(() => {});
    }

    return NextResponse.json({ data: order });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update status";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
