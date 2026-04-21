"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

type LineItem = {
  itemId?: string;
  name: string;
  sku: string;
  unit: string;
  qtyOrdered: number;
  unitCost: number;
  lineTotal: number;
};

type RawItem = {
  id: string;
  name: string;
  sku: string | null;
  unit: string | null;
  costPerUnit: number;
};

function fmt(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

export function POForm({ rawItems }: { rawItems: RawItem[] }) {
  const router = useRouter();

  const [vendor, setVendor] = useState("");
  const [vendorContact, setVendorContact] = useState("");
  const [vendorEmail, setVendorEmail] = useState("");
  const [expectedDelivery, setExpectedDelivery] = useState("");
  const [notes, setNotes] = useState("");
  const [tax, setTax] = useState(0);
  const [shipping, setShipping] = useState(0);
  const [items, setItems] = useState<LineItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Search for raw items
  const [searchTerm, setSearchTerm] = useState("");
  const filtered = searchTerm.length >= 2
    ? rawItems.filter((i) =>
        i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (i.sku && i.sku.toLowerCase().includes(searchTerm.toLowerCase())),
      ).slice(0, 10)
    : [];

  function addItem(raw: RawItem) {
    if (items.some((i) => i.itemId === raw.id)) return;
    setItems([...items, {
      itemId: raw.id,
      name: raw.name,
      sku: raw.sku || "",
      unit: raw.unit || "",
      qtyOrdered: 1,
      unitCost: raw.costPerUnit,
      lineTotal: raw.costPerUnit,
    }]);
    setSearchTerm("");
  }

  function updateItem(index: number, field: keyof LineItem, value: number | string) {
    setItems((prev) => prev.map((item, i) => {
      if (i !== index) return item;
      const updated = { ...item, [field]: value };
      updated.lineTotal = updated.qtyOrdered * updated.unitCost;
      return updated;
    }));
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);
  const total = subtotal + tax + shipping;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) { setError("Add at least one item"); return; }
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendor, vendorContact, vendorEmail, expectedDelivery, notes,
          tax, shipping,
          items: items.map((i) => ({
            itemId: i.itemId,
            name: i.name,
            sku: i.sku,
            unit: i.unit,
            qtyOrdered: i.qtyOrdered,
            unitCost: i.unitCost,
            lineTotal: i.lineTotal,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create PO");
        return;
      }

      const { data } = await res.json();
      router.push(`/purchase-orders/${data.id}`);
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Vendor Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Vendor Name *</label>
              <Input value={vendor} onChange={(e) => setVendor(e.target.value)} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Contact Name</label>
              <Input value={vendorContact} onChange={(e) => setVendorContact(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Email</label>
              <Input type="email" value={vendorEmail} onChange={(e) => setVendorEmail(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Expected Delivery</label>
              <Input type="date" value={expectedDelivery} onChange={(e) => setExpectedDelivery(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Notes</label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Line Items</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {/* Search and add */}
          <div className="relative">
            <Input
              placeholder="Search raw materials to add..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {filtered.length > 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-popover shadow-lg">
                {filtered.map((raw) => (
                  <button
                    key={raw.id}
                    type="button"
                    onClick={() => addItem(raw)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                  >
                    <span className="font-medium">{raw.name}</span>
                    {raw.sku && <span className="ml-2 text-muted-foreground">{raw.sku}</span>}
                    <span className="ml-2 text-muted-foreground">{fmt(raw.costPerUnit)}/{raw.unit || "unit"}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {items.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="font-medium">{item.name}</div>
                      {item.sku && <div className="text-xs text-muted-foreground">{item.sku}</div>}
                    </TableCell>
                    <TableCell>{item.unit || "—"}</TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min="0.01"
                        step="any"
                        className="w-20 text-right"
                        value={item.qtyOrdered}
                        onChange={(e) => updateItem(i, "qtyOrdered", Number(e.target.value))}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-24 text-right"
                        value={item.unitCost}
                        onChange={(e) => updateItem(i, "unitCost", Number(e.target.value))}
                      />
                    </TableCell>
                    <TableCell className="text-right font-medium">{fmt(item.lineTotal)}</TableCell>
                    <TableCell>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(i)}>
                        <Trash2 className="size-4 text-muted-foreground" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">Search for raw materials above to add line items.</p>
          )}

          <div className="space-y-2 border-t pt-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{fmt(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Tax</span>
              <Input
                type="number"
                min="0"
                step="0.01"
                className="w-24 text-right"
                value={tax}
                onChange={(e) => setTax(Number(e.target.value))}
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Shipping</span>
              <Input
                type="number"
                min="0"
                step="0.01"
                className="w-24 text-right"
                value={shipping}
                onChange={(e) => setShipping(Number(e.target.value))}
              />
            </div>
            <div className="flex justify-between border-t pt-2 text-base font-bold">
              <span>Total</span>
              <span>{fmt(total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create Purchase Order"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
