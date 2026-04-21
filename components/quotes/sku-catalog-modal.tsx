"use client";

import { useEffect, useState } from "react";
import { Search, X, Package, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type SkuResult = {
  id: string;
  code: string;
  name: string;
  category: string;
  retailPrice: number | null;
  wholesalePrice: number | null;
  description: string | null;
};

export function SkuCatalogModal({
  onSelect,
  onClose,
}: {
  onSelect: (sku: SkuResult) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [skus, setSkus] = useState<SkuResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSkus();
  }, []);

  async function fetchSkus() {
    setLoading(true);
    try {
      const res = await fetch("/api/quotes/skus");
      if (res.ok) {
        const { data } = await res.json();
        setSkus(data);
      }
    } finally {
      setLoading(false);
    }
  }

  const filtered = skus.filter((sku) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      sku.code.toLowerCase().includes(term) ||
      sku.name.toLowerCase().includes(term) ||
      sku.category.toLowerCase().includes(term)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-xl rounded-xl border bg-card shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-5 pb-3">
          <h3 className="text-base font-semibold tracking-tight">SKU Catalog</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="border-b px-5 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search SKUs by name or code..."
              className="w-full rounded-lg border bg-background py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
          </div>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No SKUs found
            </div>
          ) : (
            filtered.map((sku) => (
              <button
                key={sku.id}
                onClick={() => onSelect(sku)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-secondary/25"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded bg-secondary">
                  <Package className="size-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{sku.name}</span>
                    <Badge variant="secondary" className="text-[10px]">
                      {sku.code}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {sku.category.replace(/_/g, " ")}
                  </div>
                </div>
                <span className="shrink-0 text-sm font-medium">
                  {sku.retailPrice != null
                    ? `$${sku.retailPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                    : <Badge variant="warning" className="text-[10px]">No price</Badge>}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
