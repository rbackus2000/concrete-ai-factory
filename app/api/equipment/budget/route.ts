import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  const body = await request.json();

  const budget = await prisma.equipmentBudget.upsert({
    where: { id: body.id || "new" },
    create: {
      label: body.label,
      allocatedAmount: body.allocatedAmount,
      notes: body.notes,
    },
    update: {
      label: body.label,
      allocatedAmount: body.allocatedAmount,
      notes: body.notes,
    },
  });
  return NextResponse.json(budget);
}
