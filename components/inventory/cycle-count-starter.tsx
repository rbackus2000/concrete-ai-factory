"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CycleCountClient } from "./cycle-count-client";

type CountData = {
  id: string;
  status: string;
  scope: string;
  startedAt: string;
  lines: Array<{
    id: string;
    itemId: string;
    itemName: string;
    itemSku: string | null;
    systemQty: number;
    countedQty: number | null;
    variance: number | null;
  }>;
};

export function CycleCountStarter() {
  const router = useRouter();
  const [activeCount, setActiveCount] = useState<CountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [scope, setScope] = useState("ALL");
  const [error, setError] = useState("");

  useEffect(() => {
    // Check for active count
    fetch("/api/stock-counts")
      .then((r) => r.json())
      .then(({ data }) => {
        const active = data?.find((c: { status: string }) => c.status === "IN_PROGRESS");
        if (active) {
          // Load full count with lines
          fetch(`/api/stock-counts/${active.id}`)
            .then((r) => r.json())
            .then(({ data: full }) => {
              setActiveCount({
                ...full,
                startedAt: full.startedAt,
                lines: full.lines.map((l: { createdAt: string } & Record<string, unknown>) => ({
                  ...l,
                })),
              });
            });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleStart() {
    setError("");
    setCreating(true);
    try {
      const res = await fetch("/api/stock-counts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to start count");
        return;
      }

      const { data } = await res.json();
      // Reload the full count
      const fullRes = await fetch(`/api/stock-counts/${data.id}`);
      const { data: full } = await fullRes.json();
      setActiveCount(full);
    } catch {
      setError("Network error");
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  if (activeCount) {
    return <CycleCountClient count={activeCount} />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Start New Count</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium">Scope</label>
          <div className="flex flex-wrap gap-3">
            {[
              { value: "ALL", label: "All Items" },
              { value: "FINISHED_PRODUCT", label: "Finished Products Only" },
              { value: "RAW_MATERIAL", label: "Raw Materials Only" },
            ].map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="scope"
                  checked={scope === opt.value}
                  onChange={() => setScope(opt.value)}
                  className="accent-primary"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button onClick={handleStart} disabled={creating}>
          {creating ? "Starting..." : "Start Count"}
        </Button>

        <p className="text-xs text-muted-foreground">
          This will create a count sheet with the current system quantities for all items in the selected scope.
          Walk the warehouse with the printed sheet, then enter your physical counts.
        </p>
      </CardContent>
    </Card>
  );
}
