"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { syncAllMaterialPricesAction } from "@/app/actions/admin-actions";

export function SyncAllPricesButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  function handleSync() {
    setResult(null);
    startTransition(async () => {
      try {
        const results = await syncAllMaterialPricesAction();
        const updated = results.filter((r) => r.priceChanged).length;
        const failed = results.filter((r) => !r.success).length;
        setResult(`Synced ${results.length} materials — ${updated} updated, ${failed} failed`);
        router.refresh();
      } catch (e) {
        setResult(e instanceof Error ? e.message : "Sync failed.");
      }
    });
  }

  return (
    <div className="flex items-center gap-3">
      {result && (
        <span className="text-xs text-muted-foreground">{result}</span>
      )}
      <Button variant="outline" size="sm" disabled={isPending} onClick={handleSync}>
        {isPending ? "Syncing Prices..." : "Sync All Prices"}
      </Button>
    </div>
  );
}
