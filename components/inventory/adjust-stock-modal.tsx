"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  ADD_REASONS_FINISHED,
  ADD_REASONS_RAW,
  REMOVE_REASONS,
  type InventoryTypeValue,
} from "@/lib/schemas/inventory";

type Props = {
  itemId: string;
  itemName: string;
  itemType: InventoryTypeValue;
  itemUnit: string | null;
  currentQty: number;
  mode: "add" | "remove";
  onClose: () => void;
};

function getReasonsForContext(mode: "add" | "remove", itemType: InventoryTypeValue) {
  if (mode === "remove") return REMOVE_REASONS;
  return itemType === "FINISHED_PRODUCT" ? ADD_REASONS_FINISHED : ADD_REASONS_RAW;
}

export function AdjustStockModal({ itemId, itemName, itemType, itemUnit, currentQty, mode, onClose }: Props) {
  const router = useRouter();
  const reasons = getReasonsForContext(mode, itemType);
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState<string>(reasons[0]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const qtyNum = Number(qty);
    if (!qtyNum || qtyNum <= 0) {
      setError("Enter a valid quantity");
      return;
    }

    const qtyChange = mode === "add" ? qtyNum : -qtyNum;

    setLoading(true);
    try {
      const res = await fetch(`/api/inventory/${itemId}/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qtyChange, reason, notes: notes || undefined }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to adjust stock");
        return;
      }

      router.refresh();
      onClose();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {mode === "add" ? "Add Stock" : "Remove Stock"} — {itemName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Current on hand: <span className="font-semibold text-foreground">{currentQty}</span>
            {itemUnit && <span className="ml-1">{itemUnit}</span>}
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Quantity</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0.01"
                  step="any"
                  placeholder="0"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  autoFocus
                  className="flex-1"
                />
                {itemUnit && (
                  <span className="shrink-0 rounded-md border border-input bg-muted px-3 py-2 text-sm font-medium text-muted-foreground">
                    {itemUnit}
                  </span>
                )}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Reason</label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              >
                {reasons.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Notes (optional)</label>
              <Input
                placeholder="Additional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-3">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? "Saving..." : mode === "add" ? "Add Stock" : "Remove Stock"}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
