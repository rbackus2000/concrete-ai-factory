import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const updateData: Record<string, unknown> = {};
  if (body.status !== undefined) updateData.status = body.status;
  if (body.actualCost !== undefined) updateData.actualCost = body.actualCost;
  if (body.purchaseDate !== undefined)
    updateData.purchaseDate = body.purchaseDate ? new Date(body.purchaseDate) : null;
  if (body.notes !== undefined) updateData.notes = body.notes;
  if (body.supplierName !== undefined) updateData.supplierName = body.supplierName;
  if (body.supplierUrl !== undefined) updateData.supplierUrl = body.supplierUrl;

  try {
    const item = await prisma.equipmentItem.update({
      where: { id },
      data: updateData,
    });
    return NextResponse.json(item);
  } catch {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }
}
