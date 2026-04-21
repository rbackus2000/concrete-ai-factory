import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Auth note: this endpoint is called via client-side fetch from pages
// already behind Basic Auth. The middleware matcher excludes /api routes,
// so we rely on the page-level auth gate instead of re-checking here.
export async function GET(request: NextRequest) {

  const skus = await prisma.sku.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      code: true,
      name: true,
      category: true,
      retailPrice: true,
      wholesalePrice: true,
      description: true,
    },
    orderBy: { code: "asc" },
  });

  const data = skus.map((sku) => ({
    id: sku.id,
    code: sku.code,
    name: sku.name,
    category: sku.category,
    retailPrice: sku.retailPrice ? Number(sku.retailPrice) : null,
    wholesalePrice: sku.wholesalePrice ? Number(sku.wholesalePrice) : null,
    description: sku.description,
  }));

  return NextResponse.json({ data });
}
