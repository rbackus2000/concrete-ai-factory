"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LEAD_STAGES } from "@/lib/schemas/contact";

const stageLabels: Record<string, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUOTED: "Quoted",
  NEGOTIATING: "Negotiating",
  WON: "Won",
  LOST: "Lost",
};

export function ContactFilters({
  currentStage,
  currentSearch,
}: {
  currentStage?: string;
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
    router.push(`/contacts?${params.toString()}`);
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
              placeholder="Search contacts..."
              className="h-9 rounded-lg border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </form>

        <div className="flex flex-wrap gap-1.5">
          <Button
            variant={!currentStage ? "default" : "outline"}
            size="sm"
            onClick={() => updateParams("stage", undefined)}
          >
            All
          </Button>
          {LEAD_STAGES.map((stage) => (
            <Button
              key={stage}
              variant={currentStage === stage ? "default" : "outline"}
              size="sm"
              onClick={() => updateParams("stage", currentStage === stage ? undefined : stage)}
            >
              {stageLabels[stage]}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
