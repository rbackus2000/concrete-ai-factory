import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/shared";
import { getSystemActor } from "@/lib/auth/session";
import { bulkActionSchema } from "@/lib/schemas/order";
import { updateOrderStatus, getOrder } from "@/lib/services/order-service";

function getActor(request: NextRequest) {
  return authenticateRequest(request.headers.get("authorization")) ?? getSystemActor();
}

export async function POST(request: NextRequest) {
  const actor = getActor(request);
  const body = await request.json();
  const parsed = bulkActionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", message: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { orderIds, action } = parsed.data;
  const results: Array<{ orderId: string; success: boolean; error?: string }> = [];

  for (const orderId of orderIds) {
    try {
      if (action === "MARK_IN_PRODUCTION") {
        await updateOrderStatus(orderId, "IN_PRODUCTION", actor);
      } else if (action === "MARK_READY_TO_SHIP") {
        await updateOrderStatus(orderId, "READY_TO_SHIP", actor);
      } else if (action === "PRINT_LABELS") {
        const order = await getOrder(orderId);
        results.push({
          orderId,
          success: !!order?.labelUrl,
          error: order?.labelUrl ? undefined : "No label available",
        });
        continue;
      } else if (action === "PRINT_PACKING_SLIPS") {
        results.push({ orderId, success: true });
        continue;
      }
      results.push({ orderId, success: true });
    } catch (err) {
      results.push({
        orderId,
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({ data: results });
}
