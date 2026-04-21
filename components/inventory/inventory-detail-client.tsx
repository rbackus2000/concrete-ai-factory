"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowDownCircle, ArrowUpCircle, Minus, Package, Plus, Printer,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { InventoryTypeBadge } from "./inventory-type-badge";
import { AdjustStockModal } from "./adjust-stock-modal";
import { BarcodeLabel } from "./barcode-label";
import type { InventoryTypeValue } from "@/lib/schemas/inventory";

type Movement = {
  id: string;
  type: string;
  qtyChange: number;
  qtyBefore: number;
  qtyAfter: number;
  reason: string;
  notes: string | null;
  referenceType: string | null;
  referenceId: string | null;
  referenceNumber: string | null;
  createdAt: string;
  createdBy: string | null;
};

type POItem = {
  id: string;
  qtyOrdered: number;
  qtyReceived: number;
  po: { id: string; poNumber: string; status: string };
};

type ItemData = {
  id: string;
  type: InventoryTypeValue;
  name: string;
  sku: string | null;
  barcode: string | null;
  description: string | null;
  category: string | null;
  imageUrl: string | null;
  unit: string | null;
  vendor: string | null;
  vendorSku: string | null;
  costPerUnit: number;
  qtyOnHand: number;
  qtyReserved: number;
  qtyOnOrder: number;
  qtyAvailable: number;
  reorderPoint: number;
  reorderQty: number;
  totalValue: number;
  isLowStock: boolean;
  movements: Movement[];
  purchaseOrderItems: POItem[];
};

function fmt(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function InventoryDetailClient({ item }: { item: ItemData }) {
  const [adjustMode, setAdjustMode] = useState<"add" | "remove" | null>(null);

  const stockCards = [
    { label: "On Hand", value: item.qtyOnHand, highlight: false },
    { label: "Reserved", value: item.qtyReserved, highlight: false },
    { label: "On Order", value: item.qtyOnOrder, highlight: false },
    { label: "Available", value: item.qtyAvailable, highlight: item.isLowStock },
  ];

  return (
    <>
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        {/* LEFT COLUMN */}
        <div className="space-y-4">
          {/* Info bar */}
          <Card>
            <CardContent className="flex flex-wrap items-center gap-3 p-4">
              <InventoryTypeBadge type={item.type} />
              {item.sku && <Badge variant="outline">{item.sku}</Badge>}
              {item.category && <Badge variant="secondary">{item.category}</Badge>}
              {item.isLowStock && <Badge variant="destructive">Low Stock</Badge>}
              {item.description && (
                <p className="w-full text-sm text-muted-foreground">{item.description}</p>
              )}
            </CardContent>
          </Card>

          {/* Barcode */}
          {item.barcode && (
            <Card>
              <CardContent className="flex items-center justify-between p-4">
                <BarcodeLabel
                  value={item.barcode}
                  name={item.name}
                  sku={item.sku}
                  width={2}
                  height={50}
                />
                <div className="flex flex-col gap-1">
                  <Link href="/inventory/labels">
                    <Button variant="outline" size="sm">
                      <Printer className="mr-1 size-3" /> Print Label
                    </Button>
                  </Link>
                  <p className="text-xs text-muted-foreground text-right">{item.barcode}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stock Level Cards */}
          <div className="grid gap-4 sm:grid-cols-4">
            {stockCards.map((s) => (
              <Card key={s.label}>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className={`text-2xl font-bold ${s.highlight ? "text-red-600" : ""}`}>
                    {s.value}
                    {item.unit && <span className="ml-1 text-sm font-normal text-muted-foreground">{item.unit}</span>}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Quick Adjust */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setAdjustMode("add")}>
              <Plus className="mr-1 size-4" /> Add Stock
            </Button>
            <Button variant="outline" onClick={() => setAdjustMode("remove")}>
              <Minus className="mr-1 size-4" /> Remove Stock
            </Button>
            <Button
              variant="outline"
              onClick={() => window.print()}
            >
              <Printer className="mr-1 size-4" /> Print Label
            </Button>
          </div>

          {/* Movement History */}
          <Card>
            <CardHeader>
              <CardTitle>Stock Movement History</CardTitle>
            </CardHeader>
            <CardContent>
              {item.movements.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Qty Change</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Reference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {item.movements.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="text-muted-foreground">{fmtDate(m.createdAt)}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1">
                            {m.type === "IN" ? (
                              <ArrowDownCircle className="size-3.5 text-emerald-600" />
                            ) : m.type === "OUT" ? (
                              <ArrowUpCircle className="size-3.5 text-red-600" />
                            ) : (
                              <Package className="size-3.5 text-amber-600" />
                            )}
                            <Badge variant={m.type === "IN" ? "success" : m.type === "OUT" ? "destructive" : "warning"}>
                              {m.type}
                            </Badge>
                          </span>
                        </TableCell>
                        <TableCell className={`text-right font-medium ${m.qtyChange > 0 ? "text-emerald-600" : m.qtyChange < 0 ? "text-red-600" : ""}`}>
                          {m.qtyChange > 0 ? "+" : ""}{m.qtyChange}
                        </TableCell>
                        <TableCell className="text-right">{m.qtyAfter}</TableCell>
                        <TableCell className="text-sm">{m.reason}</TableCell>
                        <TableCell>
                          {m.referenceType === "PO" && m.referenceId ? (
                            <Link href={`/purchase-orders/${m.referenceId}`} className="text-primary underline-offset-4 hover:underline">
                              {m.referenceNumber || "PO"}
                            </Link>
                          ) : m.referenceType === "INVOICE" && m.referenceId ? (
                            <Link href={`/invoices/${m.referenceId}`} className="text-primary underline-offset-4 hover:underline">
                              {m.referenceNumber || "Invoice"}
                            </Link>
                          ) : m.referenceNumber ? (
                            <span className="text-muted-foreground">{m.referenceNumber}</span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">No stock movements yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-3 p-4">
              <Link href={`/inventory/${item.id}/edit`}>
                <Button className="w-full" variant="outline">Edit Item</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Valuation</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cost per Unit</span>
                <span className="font-medium">{fmt(item.costPerUnit)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Value</span>
                <span className="font-bold">{fmt(item.totalValue)}</span>
              </div>
              {item.unit && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Unit</span>
                  <span>{item.unit}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {(item.vendor || item.vendorSku) && (
            <Card>
              <CardHeader><CardTitle>Supplier</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {item.vendor && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Vendor</span>
                    <span className="font-medium">{item.vendor}</span>
                  </div>
                )}
                {item.vendorSku && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Vendor SKU</span>
                    <span>{item.vendorSku}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>Reorder Settings</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reorder Point</span>
                <span className="font-medium">{item.reorderPoint}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Suggested Reorder Qty</span>
                <span>{item.reorderQty}</span>
              </div>
            </CardContent>
          </Card>

          {item.purchaseOrderItems.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Open Purchase Orders</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {item.purchaseOrderItems.map((poi) => (
                  <div key={poi.id} className="flex items-center justify-between text-sm">
                    <Link href={`/purchase-orders/${poi.po.id}`} className="text-primary underline-offset-4 hover:underline">
                      {poi.po.poNumber}
                    </Link>
                    <span className="text-muted-foreground">
                      {poi.qtyReceived}/{poi.qtyOrdered} received
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {adjustMode && (
        <AdjustStockModal
          itemId={item.id}
          itemName={item.name}
          itemType={item.type}
          itemUnit={item.unit}
          currentQty={item.qtyOnHand}
          mode={adjustMode}
          onClose={() => setAdjustMode(null)}
        />
      )}
    </>
  );
}
