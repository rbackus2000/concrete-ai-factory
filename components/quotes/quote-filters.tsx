"use client";

import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { QUOTE_STATUSES } from "@/lib/schemas/quote";
import { cn } from "@/lib/utils";

export function QuoteFilters({
  currentStatus,
  currentSearch,
}: {
  currentStatus?: string;
  currentSearch?: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState(currentSearch ?? "");

  function applyFilters(status?: string, searchTerm?: string) {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (searchTerm) params.set("search", searchTerm);
    router.push(`/quotes?${params.toString()}`);
  }

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-3 p-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, company, or quote #"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyFilters(currentStatus, search);
            }}
            className="w-full rounded-lg border bg-background py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {search && (
            <button
              onClick={() => {
                setSearch("");
                applyFilters(currentStatus, "");
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          )}
        </div>

        {/* Status filter pills */}
        <div className="flex flex-wrap gap-1.5">
          <Button
            size="sm"
            variant={!currentStatus ? "default" : "outline"}
            onClick={() => applyFilters(undefined, currentSearch)}
          >
            All
          </Button>
          {QUOTE_STATUSES.map((status) => (
            <Button
              key={status}
              size="sm"
              variant={currentStatus === status ? "default" : "outline"}
              onClick={() =>
                applyFilters(currentStatus === status ? undefined : status, currentSearch)
              }
            >
              {status.charAt(0) + status.slice(1).toLowerCase()}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
