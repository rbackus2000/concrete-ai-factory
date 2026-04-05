import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const items = await prisma.equipmentItem.findMany({
    include: { category: true },
    orderBy: [{ phase: "asc" }, { sortOrder: "asc" }],
  });

  const headers = [
    "Phase",
    "Category",
    "Item",
    "Priority",
    "Status",
    "Cost Low",
    "Cost High",
    "Actual Cost",
    "Quantity",
    "Supplier",
    "Supplier URL",
    "Purchase Date",
    "Notes",
  ];

  const rows = items.map((item) => [
    item.phase,
    item.category.name,
    item.name,
    item.priority,
    item.status,
    item.costLow,
    item.costHigh,
    item.actualCost ?? "",
    item.quantity,
    item.supplierName ?? "",
    item.supplierUrl ?? "",
    item.purchaseDate ? new Date(item.purchaseDate).toISOString().split("T")[0] : "",
    (item.notes ?? "").replace(/"/g, '""'),
  ]);

  const csv = [
    headers.join(","),
    ...rows.map((r) => r.map((v) => `"${v}"`).join(",")),
  ].join("\n");

  const date = new Date().toISOString().split("T")[0];
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="RB-Studio-Equipment-${date}.csv"`,
    },
  });
}
