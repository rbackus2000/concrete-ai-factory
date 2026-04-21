"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

type Item = {
  id: string;
  name: string;
  sku: string | null;
  unit: string | null;
  vendor: string | null;
  qtyOnHand: number;
  reorderPoint: number;
  reorderQty: number;
  costPerUnit: number;
};

type Props = {
  vendorGroups: Record<string, Item[]>;
};

function fmt(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

export function ReorderReportClient({ vendorGroups }: Props) {
  const router = useRouter();
  const [qtys, setQtys] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const items of Object.values(vendorGroups)) {
      for (const item of items) {
        init[item.id] = item.reorderQty > 0 ? item.reorderQty : item.reorderPoint * 2;
      }
    }
    return init;
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const vendors = Object.keys(vendorGroups).sort();
  const isEmpty = vendors.length === 0;

  let grandTotal = 0;

  async function handleCreatePOs() {
    setError("");
    setCreating(true);

    const vendorOrders = vendors.map((vendor) => ({
      vendor,
      items: vendorGroups[vendor].map((item) => ({
        itemId: item.id,
        name: item.name,
        sku: item.sku ?? undefined,
        unit: item.unit ?? undefined,
        qty: qtys[item.id] || 0,
        unitCost: item.costPerUnit,
      })),
    }));

    try {
      // Create POs one at a time
      for (const order of vendorOrders) {
        const res = await fetch("/api/purchase-orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vendor: order.vendor,
            vendorContact: "",
            vendorEmail: "",
            expectedDelivery: "",
            notes: "Auto-generated from reorder report",
            tax: 0,
            shipping: 0,
            items: order.items.map((i) => ({
              itemId: i.itemId,
              name: i.name,
              sku: i.sku || "",
              unit: i.unit || "",
              qtyOrdered: i.qty,
              unitCost: i.unitCost,
              lineTotal: i.qty * i.unitCost,
            })),
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Failed to create PO");
          return;
        }
      }

      router.push("/purchase-orders");
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setCreating(false);
    }
  }

  if (isEmpty) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-lg font-medium">All materials are above reorder point</p>
          <p className="mt-1 text-sm text-muted-foreground">No orders needed this week.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {vendors.map((vendor) => {
        const items = vendorGroups[vendor];
        const vendorTotal = items.reduce((sum, i) => sum + (qtys[i.id] || 0) * i.costPerUnit, 0);
        grandTotal += vendorTotal;

        return (
          <Card key={vendor}>
            <CardHeader>
              <CardTitle>{vendor}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">On Hand</TableHead>
                    <TableHead className="text-right">Reorder At</TableHead>
                    <TableHead className="text-right">Order Qty</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead className="text-right">Est. Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const orderQty = qtys[item.id] || 0;
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="font-medium">{item.name}</div>
                          {item.sku && <div className="text-xs text-muted-foreground">{item.sku}</div>}
                        </TableCell>
                        <TableCell>{item.unit || "—"}</TableCell>
                        <TableCell className="text-right text-red-600 font-medium">{item.qtyOnHand}</TableCell>
                        <TableCell className="text-right">{item.reorderPoint}</TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min="0"
                            step="any"
                            className="w-20 text-right"
                            value={orderQty}
                            onChange={(e) =>
                              setQtys((prev) => ({ ...prev, [item.id]: Number(e.target.value) }))
                            }
                          />
                        </TableCell>
                        <TableCell className="text-right">{fmt(item.costPerUnit)}</TableCell>
                        <TableCell className="text-right font-medium">{fmt(orderQty * item.costPerUnit)}</TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow>
                    <TableCell colSpan={6} className="text-right font-medium">Vendor Subtotal</TableCell>
                    <TableCell className="text-right font-bold">{fmt(vendorTotal)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}

      <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
        <div>
          <p className="text-sm text-muted-foreground">Grand Total</p>
          <p className="text-2xl font-bold">{fmt(grandTotal)}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => window.print()}>Print / Download</Button>
          <Button onClick={handleCreatePOs} disabled={creating}>
            {creating ? "Creating POs..." : "Create Draft POs"}
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
