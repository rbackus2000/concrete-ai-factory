"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { INVENTORY_UNITS, type InventoryTypeValue } from "@/lib/schemas/inventory";

type InitialValues = {
  id?: string;
  type: InventoryTypeValue;
  name: string;
  sku: string;
  description: string;
  category: string;
  imageUrl: string;
  skuId?: string;
  unit: string;
  vendor: string;
  vendorSku: string;
  costPerUnit: number;
  qtyOnHand: number;
  reorderPoint: number;
  reorderQty: number;
};

export function InventoryItemForm({ initial }: { initial?: InitialValues }) {
  const router = useRouter();
  const isEdit = !!initial?.id;

  const [type, setType] = useState<InventoryTypeValue>(initial?.type ?? "RAW_MATERIAL");
  const [name, setName] = useState(initial?.name ?? "");
  const [sku, setSku] = useState(initial?.sku ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? "");
  const [unit, setUnit] = useState(initial?.unit ?? "");
  const [vendor, setVendor] = useState(initial?.vendor ?? "");
  const [vendorSku, setVendorSku] = useState(initial?.vendorSku ?? "");
  const [costPerUnit, setCostPerUnit] = useState(initial?.costPerUnit ?? 0);
  const [qtyOnHand, setQtyOnHand] = useState(initial?.qtyOnHand ?? 0);
  const [reorderPoint, setReorderPoint] = useState(initial?.reorderPoint ?? 0);
  const [reorderQty, setReorderQty] = useState(initial?.reorderQty ?? 0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const body = {
      type, name, sku, description, category, imageUrl,
      unit, vendor, vendorSku, costPerUnit,
      qtyOnHand: isEdit ? undefined : qtyOnHand,
      reorderPoint, reorderQty,
    };

    try {
      const url = isEdit ? `/api/inventory/${initial!.id}` : "/api/inventory";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save item");
        return;
      }

      const { data } = await res.json();
      router.push(`/inventory/${data.id}`);
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
        <CardHeader><CardTitle>Item Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Type</label>
            <div className="flex gap-4">
              {(["FINISHED_PRODUCT", "RAW_MATERIAL"] as const).map((t) => (
                <label key={t} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="type"
                    checked={type === t}
                    onChange={() => setType(t)}
                    className="accent-primary"
                  />
                  {t === "FINISHED_PRODUCT" ? "Finished Product" : "Raw Material"}
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Name *</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">SKU / Code</label>
              <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Auto-generated if blank" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Description</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Category</label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. GFRC, Pigment, Hardware" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Image URL</label>
              <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {type === "RAW_MATERIAL" && (
        <Card>
          <CardHeader><CardTitle>Supplier Info</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Unit of Measure</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                >
                  <option value="">Select unit...</option>
                  {INVENTORY_UNITS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Vendor</label>
                <Input value={vendor} onChange={(e) => setVendor(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Vendor SKU</label>
                <Input value={vendorSku} onChange={(e) => setVendorSku(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Cost per Unit ($)</label>
              <Input type="number" min="0" step="0.01" value={costPerUnit} onChange={(e) => setCostPerUnit(Number(e.target.value))} />
            </div>
          </CardContent>
        </Card>
      )}

      {type === "FINISHED_PRODUCT" && (
        <Card>
          <CardHeader><CardTitle>Product Info</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Unit of Measure</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                >
                  <option value="">Select unit...</option>
                  {INVENTORY_UNITS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Cost per Unit ($)</label>
                <Input type="number" min="0" step="0.01" value={costPerUnit} onChange={(e) => setCostPerUnit(Number(e.target.value))} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Stock Levels</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {!isEdit && (
            <div>
              <label className="mb-1 block text-sm font-medium">Initial Quantity on Hand</label>
              <Input type="number" min="0" step="any" value={qtyOnHand} onChange={(e) => setQtyOnHand(Number(e.target.value))} />
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Reorder Point</label>
              <Input type="number" min="0" step="any" value={reorderPoint} onChange={(e) => setReorderPoint(Number(e.target.value))} />
              <p className="mt-1 text-xs text-muted-foreground">Alert when qty drops to or below this</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Suggested Reorder Qty</label>
              <Input type="number" min="0" step="any" value={reorderQty} onChange={(e) => setReorderQty(Number(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : isEdit ? "Save Changes" : "Create Item"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
