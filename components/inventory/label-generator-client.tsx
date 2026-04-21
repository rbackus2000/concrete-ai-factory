"use client";

import { useEffect, useState, useCallback } from "react";
import { Printer, Search, X } from "lucide-react";
import JsBarcode from "jsbarcode";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BarcodeLabel } from "./barcode-label";

type LabelItem = {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  type: string;
  category: string | null;
  qtyOnHand: number;
  unit: string | null;
};

export function LabelGeneratorClient() {
  const [allItems, setAllItems] = useState<LabelItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [copies, setCopies] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/inventory/labels")
      .then((r) => r.json())
      .then(({ data }) => setAllItems(data || []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = search
    ? allItems.filter(
        (i) =>
          i.name.toLowerCase().includes(search.toLowerCase()) ||
          (i.sku && i.sku.toLowerCase().includes(search.toLowerCase())) ||
          (i.barcode && i.barcode.toLowerCase().includes(search.toLowerCase())),
      )
    : allItems;

  const selectedItems = allItems.filter((i) => selectedIds.has(i.id));

  function toggleItem(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    if (!copies[id]) {
      setCopies((prev) => ({ ...prev, [id]: 1 }));
    }
  }

  function selectAll() {
    const ids = new Set(filtered.map((i) => i.id));
    setSelectedIds(ids);
    const newCopies = { ...copies };
    for (const id of ids) {
      if (!newCopies[id]) newCopies[id] = 1;
    }
    setCopies(newCopies);
  }

  function clearAll() {
    setSelectedIds(new Set());
  }

  const handlePrint = useCallback(() => {
    // Build label entries
    const entries: LabelItem[] = [];
    for (const item of selectedItems) {
      const count = copies[item.id] || 1;
      for (let i = 0; i < count; i++) {
        entries.push(item);
      }
    }
    if (entries.length === 0) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const doc = printWindow.document;

    // Build page structure with safe DOM methods
    const title = doc.createElement("title");
    title.textContent = "RB Studio — Barcode Labels";
    doc.head.appendChild(title);

    const style = doc.createElement("style");
    style.textContent = [
      "@page { size: letter; margin: 0.5in 0.19in; }",
      "* { margin: 0; padding: 0; box-sizing: border-box; }",
      "body { font-family: Arial, Helvetica, sans-serif; }",
      ".label-grid { display: grid; grid-template-columns: repeat(3, 2.625in); grid-auto-rows: 1in; gap: 0in 0.125in; }",
      ".label { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2px 4px; overflow: hidden; }",
      ".label-name { font-size: 8pt; font-weight: 700; text-align: center; line-height: 1.1; max-height: 20px; overflow: hidden; }",
      ".label-sku { font-size: 6pt; color: #666; text-align: center; }",
      ".label svg { max-width: 100%; height: auto; }",
    ].join("\n");
    doc.head.appendChild(style);

    const grid = doc.createElement("div");
    grid.className = "label-grid";

    for (const item of entries) {
      const label = doc.createElement("div");
      label.className = "label";

      const nameEl = doc.createElement("div");
      nameEl.className = "label-name";
      nameEl.textContent = item.name;
      label.appendChild(nameEl);

      if (item.sku && item.sku !== item.barcode) {
        const skuEl = doc.createElement("div");
        skuEl.className = "label-sku";
        skuEl.textContent = item.sku;
        label.appendChild(skuEl);
      }

      if (item.barcode) {
        // Create SVG and render barcode directly via JsBarcode
        const svgNs = "http://www.w3.org/2000/svg";
        const svg = doc.createElementNS(svgNs, "svg");
        label.appendChild(svg);

        try {
          JsBarcode(svg, item.barcode, {
            format: "CODE128",
            width: 1.5,
            height: 28,
            displayValue: true,
            fontSize: 10,
            margin: 2,
            background: "#ffffff",
            lineColor: "#000000",
          });
        } catch {
          // Skip invalid barcode
        }
      }

      grid.appendChild(label);
    }

    doc.body.appendChild(grid);

    setTimeout(() => {
      printWindow.print();
    }, 300);
  }, [selectedItems, copies]);

  // Build label entries for preview
  const labelEntries: LabelItem[] = [];
  for (const item of selectedItems) {
    const count = copies[item.id] || 1;
    for (let i = 0; i < count; i++) {
      labelEntries.push(item);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading inventory items...</p>;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
      {/* LEFT — Item Picker */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Select Items ({selectedIds.size} selected)</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAll}>Select All</Button>
                <Button variant="outline" size="sm" onClick={clearAll}>Clear</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search items..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="max-h-[60vh] space-y-1 overflow-y-auto">
              {filtered.map((item) => {
                const isSelected = selectedIds.has(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleItem(item.id)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      isSelected
                        ? "bg-primary/10 border border-primary/30"
                        : "hover:bg-muted border border-transparent"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      className="accent-primary"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.barcode || "No barcode"}{item.category ? ` — ${item.category}` : ""}
                      </p>
                    </div>
                    <Badge variant={item.type === "FINISHED_PRODUCT" ? "default" : "secondary"} className="text-[10px]">
                      {item.type === "FINISHED_PRODUCT" ? "Product" : "Material"}
                    </Badge>
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">No items found.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* RIGHT — Label Preview & Print */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Label Preview</CardTitle>
              <Button onClick={handlePrint} disabled={labelEntries.length === 0}>
                <Printer className="mr-1 size-4" /> Print Labels
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {selectedItems.length > 0 ? (
              <div className="space-y-3">
                {/* Copies per item */}
                {selectedItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg border p-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.barcode}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-muted-foreground">Copies:</label>
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        className="w-16 text-center text-sm"
                        value={copies[item.id] || 1}
                        onChange={(e) =>
                          setCopies((prev) => ({ ...prev, [item.id]: Math.max(1, Number(e.target.value)) }))
                        }
                      />
                      <button onClick={() => toggleItem(item.id)}>
                        <X className="size-4 text-muted-foreground hover:text-foreground" />
                      </button>
                    </div>
                  </div>
                ))}

                <p className="text-xs text-muted-foreground">
                  {labelEntries.length} label{labelEntries.length !== 1 ? "s" : ""} total
                  — fits {Math.ceil(labelEntries.length / 30)} sheet{Math.ceil(labelEntries.length / 30) !== 1 ? "s" : ""} (Avery 5160, 30/sheet)
                </p>

                {/* Preview grid — renders actual barcodes */}
                <div className="grid grid-cols-3 gap-1 rounded-lg border bg-white p-2">
                  {labelEntries.slice(0, 12).map((item, i) => (
                    <div
                      key={`${item.id}-${i}`}
                      className="flex items-center justify-center rounded border border-dashed border-gray-200 p-1"
                      style={{ minHeight: 72 }}
                    >
                      {item.barcode ? (
                        <BarcodeLabel
                          value={item.barcode}
                          name={item.name}
                          sku={item.sku}
                          width={1.2}
                          height={24}
                        />
                      ) : (
                        <p className="text-[9px] text-gray-400">No barcode</p>
                      )}
                    </div>
                  ))}
                  {labelEntries.length > 12 && (
                    <div className="col-span-3 py-1 text-center text-xs text-muted-foreground">
                      + {labelEntries.length - 12} more labels (visible on print)
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Select items from the left to generate barcode labels.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
