import { NextResponse } from "next/server";

import { getInventoryExportData } from "@/lib/services/inventory-service";

export async function GET() {
  const items = await getInventoryExportData();
  const date = new Date().toISOString().split("T")[0];

  const headers = [
    "Type", "Name", "SKU", "Category", "Unit", "Vendor", "Vendor SKU",
    "On Hand", "Reserved", "Available", "On Order", "Reorder Point",
    "Cost/Unit", "Total Value", "Low Stock",
  ];

  const rows = items.map((i) => [
    i.type, i.name, i.sku ?? "", i.category ?? "", i.unit ?? "",
    i.vendor ?? "", i.vendorSku ?? "",
    i.qtyOnHand, i.qtyReserved, i.qtyAvailable, i.qtyOnOrder,
    i.reorderPoint, i.costPerUnit, i.totalValue,
    i.isLowStock ? "YES" : "",
  ]);

  const csv = [headers.join(","), ...rows.map((r) =>
    r.map((v) => {
      const s = String(v);
      return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(","),
  )].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="rb-inventory-${date}.csv"`,
    },
  });
}
