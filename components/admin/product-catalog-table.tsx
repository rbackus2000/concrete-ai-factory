"use client";

import { useState } from "react";
import { Check, Pencil, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type SkuRow = {
  id: string;
  code: string;
  name: string;
  category: string;
  type: string;
  finish: string;
  retailPrice: number | null;
  wholesalePrice: number | null;
  outerLength: number | null;
  outerWidth: number | null;
  outerHeight: number | null;
};

const categoryLabels: Record<string, string> = {
  VESSEL_SINK: "Vessel Sink",
  FURNITURE: "Furniture",
  PANEL: "Panel",
  WALL_TILE: "Wall Tile",
};

export function ProductCatalogTable({ skus }: { skus: SkuRow[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRetail, setEditRetail] = useState("");
  const [editWholesale, setEditWholesale] = useState("");
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState(skus);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  const categories = [...new Set(rows.map((s) => s.category))];
  const filtered = filterCategory
    ? rows.filter((s) => s.category === filterCategory)
    : rows;

  function startEdit(sku: SkuRow) {
    setEditingId(sku.id);
    setEditRetail(sku.retailPrice?.toString() ?? "");
    setEditWholesale(sku.wholesalePrice?.toString() ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditRetail("");
    setEditWholesale("");
  }

  async function saveEdit(id: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/product-catalog/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          retailPrice: editRetail ? parseFloat(editRetail) : null,
          wholesalePrice: editWholesale ? parseFloat(editWholesale) : null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to save");
        return;
      }

      setRows((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                retailPrice: editRetail ? parseFloat(editRetail) : null,
                wholesalePrice: editWholesale ? parseFloat(editWholesale) : null,
              }
            : s,
        ),
      );
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  }

  function margin(retail: number | null, wholesale: number | null) {
    if (!retail || !wholesale || retail === 0) return null;
    return Math.round(((retail - wholesale) / retail) * 100);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Product Pricing</CardTitle>
        <div className="flex gap-1.5">
          <Button
            size="sm"
            variant={!filterCategory ? "default" : "outline"}
            onClick={() => setFilterCategory(null)}
          >
            All ({rows.length})
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat}
              size="sm"
              variant={filterCategory === cat ? "default" : "outline"}
              onClick={() => setFilterCategory(filterCategory === cat ? null : cat)}
            >
              {categoryLabels[cat] ?? cat} ({rows.filter((s) => s.category === cat).length})
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Dimensions</TableHead>
              <TableHead className="text-right">Retail</TableHead>
              <TableHead className="text-right">Wholesale</TableHead>
              <TableHead className="text-right">Margin</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((sku) => {
              const isEditing = editingId === sku.id;
              const m = margin(sku.retailPrice, sku.wholesalePrice);

              return (
                <TableRow key={sku.id}>
                  <TableCell className="font-mono font-medium text-primary">
                    {sku.code}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{sku.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {sku.type} / {sku.finish}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {categoryLabels[sku.category] ?? sku.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {sku.outerLength && sku.outerWidth && sku.outerHeight
                      ? `${sku.outerLength}" x ${sku.outerWidth}" x ${sku.outerHeight}"`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {isEditing ? (
                      <input
                        type="number"
                        value={editRetail}
                        onChange={(e) => setEditRetail(e.target.value)}
                        className="w-28 rounded-lg border bg-background px-2 py-1 text-right text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        step="0.01"
                        min="0"
                        autoFocus
                      />
                    ) : (
                      <span className="font-mono font-semibold">
                        {sku.retailPrice != null
                          ? `$${sku.retailPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                          : <Badge variant="warning">Not set</Badge>}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {isEditing ? (
                      <input
                        type="number"
                        value={editWholesale}
                        onChange={(e) => setEditWholesale(e.target.value)}
                        className="w-28 rounded-lg border bg-background px-2 py-1 text-right text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        step="0.01"
                        min="0"
                      />
                    ) : (
                      <span className="font-mono text-muted-foreground">
                        {sku.wholesalePrice != null
                          ? `$${sku.wholesalePrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                          : "—"}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {m != null ? (
                      <Badge variant={m >= 40 ? "success" : m >= 25 ? "warning" : "secondary"}>
                        {m}%
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <div className="flex gap-1 justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => saveEdit(sku.id)}
                          disabled={saving}
                        >
                          <Check className="size-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={cancelEdit}>
                          <X className="size-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex justify-end">
                        <Button size="sm" variant="ghost" onClick={() => startEdit(sku)}>
                          <Pencil className="size-3.5" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
