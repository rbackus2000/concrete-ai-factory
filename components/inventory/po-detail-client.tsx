"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Clock, Package, Send, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { POStatusBadge } from "./po-status-badge";
import type { POStatusType } from "@/lib/schemas/inventory";

type POItem = {
  id: string;
  itemId: string | null;
  name: string;
  sku: string | null;
  unit: string | null;
  qtyOrdered: number;
  qtyReceived: number;
  unitCost: number;
  lineTotal: number;
  item: { id: string; name: string; sku: string | null } | null;
};

type POEvent = {
  id: string;
  event: string;
  metadata: string | null;
  createdAt: string;
  createdBy: string | null;
};

type POData = {
  id: string;
  poNumber: string;
  status: POStatusType;
  vendor: string;
  vendorContact: string | null;
  vendorEmail: string | null;
  expectedDelivery: string | null;
  receivedAt: string | null;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  notes: string | null;
  items: POItem[];
  events: POEvent[];
  createdAt: string;
};

function fmt(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtDateTime(d: string) {
  return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

const EVENT_ICONS: Record<string, typeof Clock> = {
  CREATED: Clock,
  SENT: Send,
  PARTIALLY_RECEIVED: Package,
  RECEIVED: CheckCircle2,
  CANCELLED: XCircle,
};

export function PODetailClient({ po }: { po: POData }) {
  const router = useRouter();
  const [showReceive, setShowReceive] = useState(false);
  const [receiveQtys, setReceiveQtys] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const item of po.items) {
      init[item.id] = 0;
    }
    return init;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canReceive = ["SENT", "PARTIALLY_RECEIVED"].includes(po.status);
  const canSend = po.status === "DRAFT";
  const canCancel = !["RECEIVED", "CANCELLED"].includes(po.status);

  async function handleSend() {
    setLoading(true);
    try {
      await fetch(`/api/purchase-orders/${po.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "SENT" }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleReceive(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const lines = po.items
      .filter((item) => (receiveQtys[item.id] || 0) > 0)
      .map((item) => ({
        poItemId: item.id,
        itemId: item.itemId || "",
        qtyReceiving: receiveQtys[item.id],
      }));

    if (lines.length === 0) {
      setError("Enter quantities to receive");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/purchase-orders/${po.id}/receive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to receive");
        return;
      }

      setShowReceive(false);
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    if (!confirm("Cancel this purchase order?")) return;
    setLoading(true);
    try {
      await fetch(`/api/purchase-orders/${po.id}`, { method: "DELETE" });
      router.push("/purchase-orders");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
      {/* LEFT */}
      <div className="space-y-4">
        {/* Line Items */}
        <Card>
          <CardHeader><CardTitle>Items ({po.items.length})</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Ordered</TableHead>
                  <TableHead className="text-right">Received</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  {showReceive && <TableHead className="text-right">Receiving</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {po.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <span className="font-medium">
                        {item.itemId ? (
                          <Link href={`/inventory/${item.itemId}`} className="text-primary underline-offset-4 hover:underline">
                            {item.name}
                          </Link>
                        ) : (
                          item.name
                        )}
                      </span>
                      {item.sku && <div className="text-xs text-muted-foreground">{item.sku}</div>}
                    </TableCell>
                    <TableCell>{item.unit || "—"}</TableCell>
                    <TableCell className="text-right">{item.qtyOrdered}</TableCell>
                    <TableCell className="text-right">
                      <span className={item.qtyReceived >= item.qtyOrdered ? "text-emerald-600" : ""}>
                        {item.qtyReceived}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{fmt(item.unitCost)}</TableCell>
                    <TableCell className="text-right font-medium">{fmt(item.lineTotal)}</TableCell>
                    {showReceive && (
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min="0"
                          max={item.qtyOrdered - item.qtyReceived}
                          step="any"
                          className="w-20 text-right"
                          value={receiveQtys[item.id]}
                          onChange={(e) =>
                            setReceiveQtys((prev) => ({ ...prev, [item.id]: Number(e.target.value) }))
                          }
                        />
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-4 space-y-1 border-t pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{fmt(po.subtotal)}</span>
              </div>
              {po.tax > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{fmt(po.tax)}</span>
                </div>
              )}
              {po.shipping > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>{fmt(po.shipping)}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-2 text-base font-bold">
                <span>Total</span>
                <span>{fmt(po.total)}</span>
              </div>
            </div>

            {showReceive && (
              <form onSubmit={handleReceive} className="mt-4 space-y-2">
                {error && <p className="text-sm text-red-600">{error}</p>}
                <div className="flex gap-2">
                  <Button type="submit" disabled={loading}>
                    {loading ? "Processing..." : "Confirm Receipt"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowReceive(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Event Log */}
        <Card>
          <CardHeader><CardTitle>Activity</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {po.events.map((event) => {
              const Icon = EVENT_ICONS[event.event] ?? Clock;
              return (
                <div key={event.id} className="flex gap-3 text-sm">
                  <div className="mt-0.5 rounded-full bg-secondary p-1.5">
                    <Icon className="size-3 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">{event.event}</p>
                    <p className="text-xs text-muted-foreground">{fmtDateTime(event.createdAt)}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* RIGHT */}
      <div className="space-y-4">
        <Card>
          <CardContent className="space-y-3 p-4">
            {canSend && (
              <Button className="w-full" onClick={handleSend} disabled={loading}>
                Mark as Sent
              </Button>
            )}
            {canReceive && !showReceive && (
              <Button className="w-full" onClick={() => setShowReceive(true)}>
                Receive Shipment
              </Button>
            )}
            {canCancel && (
              <Button className="w-full" variant="outline" onClick={handleCancel} disabled={loading}>
                Cancel PO
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Details</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Vendor</span>
              <span className="font-medium">{po.vendor}</span>
            </div>
            {po.vendorContact && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Contact</span>
                <span>{po.vendorContact}</span>
              </div>
            )}
            {po.vendorEmail && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email</span>
                <span>{po.vendorEmail}</span>
              </div>
            )}
            {po.expectedDelivery && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Expected</span>
                <span>{fmtDate(po.expectedDelivery)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created</span>
              <span>{fmtDate(po.createdAt)}</span>
            </div>
            {po.notes && (
              <div className="border-t pt-2">
                <p className="text-muted-foreground">Notes</p>
                <p className="mt-1">{po.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
