"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

export function SyncInventoryButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null);

  async function handleSync() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/inventory/sync", { method: "POST" });
      const json = await res.json();
      setResult(json.data);
      router.refresh();
    } catch {
      // Silently fail — user can retry
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={handleSync} disabled={loading}>
        <RefreshCw className={`mr-1 size-3.5 ${loading ? "animate-spin" : ""}`} />
        {loading ? "Syncing..." : "Sync from Masters"}
      </Button>
      {result && (
        <span className="text-xs text-muted-foreground">
          {result.created} added, {result.skipped} already existed
        </span>
      )}
    </div>
  );
}
