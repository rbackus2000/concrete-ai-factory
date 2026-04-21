"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const TYPE_TABS = [
  { label: "All", value: "" },
  { label: "Finished Products", value: "FINISHED_PRODUCT" },
  { label: "Raw Materials", value: "RAW_MATERIAL" },
] as const;

const STATUS_TABS = [
  { label: "All", value: "" },
  { label: "Low Stock", value: "low_stock" },
] as const;

export function InventoryFilters({
  currentType,
  currentStatus,
  currentSearch,
}: {
  currentType?: string;
  currentStatus?: string;
  currentSearch?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(currentSearch || "");

  function navigate(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    router.push(`/inventory?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <div className="flex gap-1 rounded-lg bg-secondary p-1">
          {TYPE_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => navigate({ type: tab.value || undefined })}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                (currentType || "") === tab.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 rounded-lg bg-secondary p-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => navigate({ status: tab.value || undefined })}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                (currentStatus || "") === tab.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          navigate({ search: search || undefined });
        }}
        className="flex items-center gap-2"
      >
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search name, SKU, vendor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button type="submit" variant="outline" size="sm">
          Search
        </Button>
      </form>
    </div>
  );
}
