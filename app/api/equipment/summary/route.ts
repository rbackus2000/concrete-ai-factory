import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const items = await prisma.equipmentItem.findMany();
  const budgets = await prisma.equipmentBudget.findMany();

  // Phase breakdown
  const phases = new Map<
    number,
    {
      label: string;
      costLow: number;
      costHigh: number;
      actual: number;
      total: number;
      received: number;
    }
  >();

  for (const item of items) {
    const existing = phases.get(item.phase) || {
      label: "",
      costLow: 0,
      costHigh: 0,
      actual: 0,
      total: 0,
      received: 0,
    };
    existing.costLow += item.costLow * item.quantity;
    existing.costHigh += item.costHigh * item.quantity;
    existing.actual += (item.actualCost ?? 0) * item.quantity;
    existing.total += 1;
    if (item.status === "received" || item.status === "installed") existing.received += 1;
    phases.set(item.phase, existing);
  }

  // Status breakdown
  const statusCounts: Record<string, number> = {};
  for (const item of items) {
    statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
  }

  const totalCostLow = items.reduce((sum, i) => sum + i.costLow * i.quantity, 0);
  const totalCostHigh = items.reduce((sum, i) => sum + i.costHigh * i.quantity, 0);
  const totalActual = items.reduce((sum, i) => sum + (i.actualCost ?? 0) * i.quantity, 0);

  return NextResponse.json({
    phases: Object.fromEntries(phases),
    statusCounts,
    totalCostLow,
    totalCostHigh,
    totalActual,
    totalItems: items.length,
    budgets,
  });
}
