import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const phase = searchParams.get("phase");
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");
  const categoryId = searchParams.get("categoryId");

  const where: Record<string, unknown> = {};
  if (phase) where.phase = parseInt(phase);
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (categoryId) where.categoryId = categoryId;

  const items = await prisma.equipmentItem.findMany({
    where,
    include: { category: true },
    orderBy: [{ phase: "asc" }, { sortOrder: "asc" }],
  });
  return NextResponse.json(items);
}
