import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

export async function GET() {
  const jobs = await prisma.job.findMany({
    where: {
      status: { notIn: ["SHIPPED", "DELIVERED"] },
    },
    select: {
      id: true,
      jobNumber: true,
      status: true,
      quantity: true,
      sku: { select: { code: true, name: true } },
      client: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: jobs });
}
