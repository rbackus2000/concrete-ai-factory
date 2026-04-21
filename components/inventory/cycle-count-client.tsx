"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

type CountLine = {
  id: string;
  itemId: string;
  itemName: string;
  itemSku: string | null;
  systemQty: number;
  countedQty: number | null;
  variance: number | null;
};

type CountData = {
  id: string;
  status: string;
  scope: string;
  startedAt: string;
  lines: CountLine[];
};

export function CycleCountClient({ count }: { count: CountData }) {
  const router = useRouter();
  const [lines, setLines] = useState(count.lines);
  const [saving, setSaving] = useState<string | null>(null);
  const [committing, setCommitting] = useState(false);
  const [result, setResult] = useState<{ itemsOver: number; itemsShort: number; itemsMatch: number } | null>(null);
  const [error, setError] = useState("");

  const countedCount = lines.filter((l) => l.countedQty !== null).length;
  const totalLines = lines.length;
  const progress = totalLines > 0 ? Math.round((countedCount / totalLines) * 100) : 0;
  const allCounted = countedCount === totalLines;
  const isCommitted = count.status === "COMMITTED";

  async function handleCountChange(lineId: string, value: string) {
    const num = Number(value);
    if (value === "" || isNaN(num)) return;

    setSaving(lineId);
    setLines((prev) =>
      prev.map((l) =>
        l.id === lineId ? { ...l, countedQty: num, variance: num - l.systemQty } : l,
      ),
    );

    try {
      await fetch(`/api/stock-counts/${count.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineId, countedQty: num }),
      });
    } catch { /* ignore */ }
    setSaving(null);
  }

  async function handleCommit() {
    setError("");
    setCommitting(true);

    try {
      const res = await fetch(`/api/stock-counts/${count.id}/commit`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to commit");
        return;
      }

      const { data } = await res.json();
      setResult(data);
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setCommitting(false);
    }
  }

  if (result) {
    return (
      <Card>
        <CardContent className="space-y-4 p-8 text-center">
          <h2 className="text-2xl font-bold">Count Committed</h2>
          <div className="flex justify-center gap-6">
            <div>
              <p className="text-3xl font-bold text-emerald-600">{result.itemsOver}</p>
              <p className="text-sm text-muted-foreground">Items Over</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-red-600">{result.itemsShort}</p>
              <p className="text-sm text-muted-foreground">Items Short</p>
            </div>
            <div>
              <p className="text-3xl font-bold">{result.itemsMatch}</p>
              <p className="text-sm text-muted-foreground">Items Match</p>
            </div>
          </div>
          <Button onClick={() => router.push("/inventory")}>Back to Inventory</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Progress</p>
              <p className="text-lg font-bold">{countedCount} of {totalLines} items counted</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">{progress}%</p>
            </div>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
        </CardContent>
      </Card>

      {/* Count Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Count Sheet</CardTitle>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              Print Count Sheet
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">System Qty</TableHead>
                <TableHead className="text-right">Physical Count</TableHead>
                <TableHead className="text-right">Variance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line) => {
                const hasVariance = line.variance !== null && Math.abs(line.variance) > 0.001;
                return (
                  <TableRow key={line.id}>
                    <TableCell className="font-medium">{line.itemName}</TableCell>
                    <TableCell className="text-muted-foreground">{line.itemSku || "—"}</TableCell>
                    <TableCell className="text-right">{line.systemQty}</TableCell>
                    <TableCell className="text-right">
                      {isCommitted ? (
                        <span>{line.countedQty ?? "—"}</span>
                      ) : (
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          className="ml-auto w-24 text-right"
                          value={line.countedQty ?? ""}
                          onChange={(e) => handleCountChange(line.id, e.target.value)}
                          disabled={saving === line.id}
                          inputMode="decimal"
                        />
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {line.variance !== null ? (
                        <span className={
                          hasVariance
                            ? line.variance! > 0
                              ? "font-medium text-emerald-600"
                              : "font-medium text-red-600"
                            : "text-muted-foreground"
                        }>
                          {line.variance! > 0 ? "+" : ""}{line.variance}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {!isCommitted && (
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => router.push("/inventory")}>
            Cancel
          </Button>
          <Button
            onClick={handleCommit}
            disabled={!allCounted || committing}
          >
            {committing ? "Committing..." : "Review & Commit Count"}
          </Button>
        </div>
      )}

      {isCommitted && (
        <Badge variant="success" className="text-base">Count Committed</Badge>
      )}
    </div>
  );
}
