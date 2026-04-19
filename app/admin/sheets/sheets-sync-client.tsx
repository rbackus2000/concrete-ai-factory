"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  syncAllSheetsAction,
  syncSheetTabAction,
} from "@/app/actions/sheets-actions";

const SYNCABLE_TABS = [
  { name: "Products", description: "All SKUs with dimensions, pricing, labor" },
  { name: "Pricing", description: "Calculator-computed costs per SKU" },
  { name: "Capacity", description: "Labor hours and production capacity" },
  { name: "Inventory", description: "Stock levels per SKU" },
  { name: "Orders", description: "Jobs from the app" },
  { name: "Costing", description: "All active materials with supplier pricing" },
  { name: "Dashboard", description: "Summary metrics — revenue, orders, SKU count" },
];

type SyncStatus = {
  tab: string;
  rows: number;
  success: boolean;
  error?: string;
  syncedAt?: string;
};

export function SheetsSyncClient({ tabs }: { tabs: string[] }) {
  const [isPending, startTransition] = useTransition();
  const [syncingTab, setSyncingTab] = useState<string | null>(null);
  const [results, setResults] = useState<SyncStatus[]>([]);

  function handleSyncAll() {
    setSyncingTab("ALL");
    startTransition(async () => {
      try {
        const res = await syncAllSheetsAction();
        setResults(res.map((r) => ({ ...r, syncedAt: new Date().toISOString() })));
      } catch (e) {
        setResults([{ tab: "ALL", rows: 0, success: false, error: e instanceof Error ? e.message : "Sync failed" }]);
      } finally {
        setSyncingTab(null);
      }
    });
  }

  function handleSyncTab(tab: string) {
    setSyncingTab(tab);
    startTransition(async () => {
      try {
        const res = await syncSheetTabAction(tab);
        const result = res as SyncStatus;
        setResults((prev) => {
          const filtered = prev.filter((r) => r.tab !== tab);
          return [...filtered, { ...result, syncedAt: new Date().toISOString() }];
        });
      } catch (e) {
        setResults((prev) => {
          const filtered = prev.filter((r) => r.tab !== tab);
          return [...filtered, { tab, rows: 0, success: false, error: e instanceof Error ? e.message : "Failed" }];
        });
      } finally {
        setSyncingTab(null);
      }
    });
  }

  const getResultForTab = (tab: string) => results.find((r) => r.tab === tab);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Connected to Google Sheet with {tabs.length} tabs: {tabs.join(", ")}
          </p>
        </div>
        <Button onClick={handleSyncAll} disabled={isPending} size="lg">
          {syncingTab === "ALL" ? "Syncing All..." : "Sync All Tabs"}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {SYNCABLE_TABS.map((tab) => {
          const result = getResultForTab(tab.name);
          const isSyncing = syncingTab === tab.name;
          const isAvailable = tabs.includes(tab.name);

          return (
            <Card key={tab.name} className={!isAvailable ? "opacity-50" : ""}>
              <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
                <CardTitle className="text-base">{tab.name}</CardTitle>
                <div className="flex items-center gap-2">
                  {result && (
                    <Badge variant={result.success ? "default" : "secondary"}>
                      {result.success ? `${result.rows} rows` : "Error"}
                    </Badge>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isPending || !isAvailable}
                    onClick={() => handleSyncTab(tab.name)}
                  >
                    {isSyncing ? "Syncing..." : "Push"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{tab.description}</p>
                {!isAvailable && (
                  <p className="mt-1 text-xs text-amber-500">Tab not found in sheet</p>
                )}
                {result?.error && (
                  <p className="mt-1 text-xs text-red-500">{result.error}</p>
                )}
                {result?.syncedAt && result.success && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Last synced: {new Date(result.syncedAt).toLocaleTimeString()}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
