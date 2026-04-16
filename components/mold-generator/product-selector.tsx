"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MoldGeneratorSku } from "@/lib/services/mold-generator-service";

type Props = {
  productType: "sinks" | "tiles";
  onTypeChange: (type: "sinks" | "tiles") => void;
  skuList: MoldGeneratorSku[];
  selectedCode: string;
  onSkuChange: (code: string) => void;
};

export function ProductSelector({ productType, onTypeChange, skuList, selectedCode, onSkuChange }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Product Selection</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Type Toggle */}
        <div className="flex rounded-lg border border-border bg-muted p-1">
          <button
            type="button"
            onClick={() => onTypeChange("sinks")}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              productType === "sinks"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Sinks
          </button>
          <button
            type="button"
            onClick={() => onTypeChange("tiles")}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              productType === "tiles"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Wall Tiles
          </button>
        </div>

        {/* SKU Dropdown */}
        <div>
          <label htmlFor="sku-select" className="block text-sm font-medium text-muted-foreground mb-1.5">
            Select SKU
          </label>
          <select
            id="sku-select"
            value={selectedCode}
            onChange={(e) => onSkuChange(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Choose a product...</option>
            {skuList.map((sku) => (
              <option key={sku.code} value={sku.code}>
                {sku.code} — {sku.name}
              </option>
            ))}
          </select>
        </div>

        {/* Selected SKU summary */}
        {selectedCode && skuList.find((s) => s.code === selectedCode) && (
          <div className="rounded-lg border border-border/70 bg-secondary/40 p-3">
            <p className="text-sm font-medium">{skuList.find((s) => s.code === selectedCode)!.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">{skuList.find((s) => s.code === selectedCode)!.type}</p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              {skuList.find((s) => s.code === selectedCode)!.summary.slice(0, 150)}...
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
