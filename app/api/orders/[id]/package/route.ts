import { NextRequest, NextResponse } from "next/server";
import { updateOrderPackage } from "@/lib/services/order-service";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();

  try {
    const order = await updateOrderPackage(id, {
      weightLbs: body.weightLbs,
      weightOz: body.weightOz,
      dimLength: body.dimLength,
      dimWidth: body.dimWidth,
      dimHeight: body.dimHeight,
      packageType: body.packageType,
    });
    return NextResponse.json({ data: order });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update package";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
