"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { INVOICE_STATUSES } from "@/lib/schemas/invoice";

const statusLabels: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  VIEWED: "Viewed",
  PARTIAL: "Partial",
  PAID: "Paid",
  OVERDUE: "Overdue",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

export function InvoiceFilters({
  currentStatus,
  currentSearch,
}: {
  currentStatus?: string;
  currentSearch?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(currentSearch ?? "");

  function updateParams(key: string, value: string | undefined) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/invoices?${params.toString()}`);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    updateParams("search", search || undefined);
  }

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-3 p-4">
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoices..."
              className="h-9 rounded-lg border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </form>

        <div className="flex flex-wrap gap-1.5">
          <Button
            variant={!currentStatus ? "default" : "outline"}
            size="sm"
            onClick={() => updateParams("status", undefined)}
          >
            All
          </Button>
          {["DRAFT", "SENT", "OVERDUE", "PARTIAL", "PAID"].map((s) => (
            <Button
              key={s}
              variant={currentStatus === s ? "default" : "outline"}
              size="sm"
              onClick={() => updateParams("status", currentStatus === s ? undefined : s)}
            >
              {statusLabels[s]}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
