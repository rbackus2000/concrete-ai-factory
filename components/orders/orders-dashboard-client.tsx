"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronDown, ChevronRight, Package, Printer, Tag, Truck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { OrderStatusBadge } from "./order-status-badge";
import type { OrderStatusType } from "@/lib/schemas/order";

type OrderRow = {
  id: string;
  orderNumber: string;
  status: OrderStatusType;
  createdAt: string;
  shipByDate: string | null;
  orderTotal: number;
  trackingNumber: string | null;
  carrier: string | null;
  labelUrl: string | null;
  weightLbs: number | null;
  weightOz: number | null;
  contact: { id: string; name: string; company: string | null } | null;
  lineItems: Array<{
    id: string;
    name: string;
    sku: string | null;
    imageUrl: string | null;
    quantity: number;
    lineTotal: number;
  }>;
  _count: { lineItems: number };
};

type StatusCounts = Record<string, number>;

const TAB_STATUSES: Array<{ label: string; key: string }> = [
  { label: "All", key: "all" },
  { label: "Pending", key: "PENDING" },
  { label: "In Production", key: "IN_PRODUCTION" },
  { label: "Quality Check", key: "QUALITY_CHECK" },
  { label: "Ready to Ship", key: "READY_TO_SHIP" },
  { label: "Shipped", key: "SHIPPED" },
  { label: "Delivered", key: "DELIVERED" },
  { label: "Exception", key: "EXCEPTION" },
];

function fmt(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function OrdersDashboardClient({
  orders,
  statusCounts,
  stats,
}: {
  orders: OrderRow[];
  statusCounts: StatusCounts;
  stats: { active: number; readyToShip: number; inTransit: number; exception: number };
}) {
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const filtered = orders.filter((o) => {
    if (activeTab !== "all" && o.status !== activeTab) return false;
    if (search) {
      const s = search.toLowerCase();
      if (
        !o.orderNumber.toLowerCase().includes(s) &&
        !o.contact?.name.toLowerCase().includes(s) &&
        !o.contact?.company?.toLowerCase().includes(s) &&
        !o.trackingNumber?.toLowerCase().includes(s) &&
        !o.lineItems.some((li) => li.sku?.toLowerCase().includes(s))
      ) {
        return false;
      }
    }
    return true;
  });

  function toggleSelect(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((o) => o.id)));
    }
  }

  function toggleExpand(id: string) {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpanded(next);
  }

  async function handleBulk(action: string) {
    await fetch("/api/orders/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderIds: Array.from(selected), action }),
    });
    window.location.reload();
  }

  const now = new Date();

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Active Orders</p>
            <p className="text-2xl font-bold">{stats.active}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Ready to Ship</p>
            <p className="text-2xl font-bold text-amber-600">{stats.readyToShip}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">In Transit</p>
            <p className="text-2xl font-bold">{stats.inTransit}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Exceptions</p>
            <p className={`text-2xl font-bold ${stats.exception > 0 ? "text-red-600" : ""}`}>{stats.exception}</p>
          </CardContent>
        </Card>
      </div>

      {/* Status Tabs */}
      <div className="flex flex-wrap gap-1 border-b">
        {TAB_STATUSES.map((tab) => {
          const count = tab.key === "all" ? statusCounts.all : (statusCounts[tab.key] ?? 0);
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "border-b-2 border-primary font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span className="ml-1.5 rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search + Bulk Actions */}
      <div className="flex items-center gap-3">
        <Input
          placeholder="Search orders, customers, tracking..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{selected.size} selected</span>
            <Button variant="outline" size="sm" onClick={() => handleBulk("PRINT_LABELS")}>
              <Printer className="mr-1 size-3" /> Labels
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleBulk("PRINT_PACKING_SLIPS")}>
              <Tag className="mr-1 size-3" /> Packing Slips
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleBulk("MARK_IN_PRODUCTION")}>
              Mark In Production
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleBulk("MARK_READY_TO_SHIP")}>
              Mark Ready
            </Button>
          </div>
        )}
      </div>

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selected.size === filtered.length}
                    onChange={toggleSelectAll}
                    className="accent-primary"
                  />
                </TableHead>
                <TableHead className="w-8" />
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead>Weight</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Carrier / Tracking</TableHead>
                <TableHead>Ship By</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="py-8 text-center text-muted-foreground">
                    No orders found.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((order) => {
                const isExpanded = expanded.has(order.id);
                const shipByDate = order.shipByDate ? new Date(order.shipByDate) : null;
                const isPastDue = shipByDate && shipByDate < now && !["DELIVERED", "CANCELLED", "SHIPPED", "IN_TRANSIT", "OUT_FOR_DELIVERY"].includes(order.status);
                const totalWeight = (order.weightLbs || 0) + (order.weightOz || 0) / 16;

                return (
                  <>
                    <TableRow key={order.id} className={isExpanded ? "border-b-0" : ""}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selected.has(order.id)}
                          onChange={() => toggleSelect(order.id)}
                          className="accent-primary"
                        />
                      </TableCell>
                      <TableCell>
                        <button onClick={() => toggleExpand(order.id)} className="text-muted-foreground hover:text-foreground">
                          {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                        </button>
                      </TableCell>
                      <TableCell>
                        <Link href={`/orders/${order.id}`} className="font-medium text-primary underline-offset-4 hover:underline">
                          {order.orderNumber}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="font-medium">{order.contact?.name || "—"}</span>
                          {order.contact?.company && (
                            <p className="text-xs text-muted-foreground">{order.contact.company}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{fmtDate(order.createdAt)}</TableCell>
                      <TableCell className="text-right">{order._count.lineItems}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {totalWeight > 0 ? `${totalWeight.toFixed(1)} lbs` : "—"}
                      </TableCell>
                      <TableCell><OrderStatusBadge status={order.status} /></TableCell>
                      <TableCell>
                        {order.carrier && order.trackingNumber ? (
                          <div className="text-xs">
                            <span className="font-medium">{order.carrier}</span>
                            <p className="text-muted-foreground">{order.trackingNumber}</p>
                          </div>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        {shipByDate ? (
                          <span className={isPastDue ? "font-medium text-red-600" : "text-muted-foreground"}>
                            {fmtDate(order.shipByDate!)}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Link href={`/orders/${order.id}`}>
                            <Button variant="outline" size="sm">View</Button>
                          </Link>
                          {["READY_TO_SHIP", "LABEL_PURCHASED"].includes(order.status) && (
                            <Link href={`/orders/${order.id}/ship`}>
                              <Button variant="outline" size="sm">
                                <Truck className="mr-1 size-3" /> Ship
                              </Button>
                            </Link>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow key={`${order.id}-expand`} className="bg-secondary/30">
                        <TableCell colSpan={11} className="py-2">
                          <div className="flex flex-wrap gap-3 pl-10">
                            {order.lineItems.map((li) => (
                              <div key={li.id} className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm">
                                {li.imageUrl ? (
                                  <img src={li.imageUrl} alt="" className="size-8 rounded object-cover" />
                                ) : (
                                  <Package className="size-8 text-muted-foreground" />
                                )}
                                <div>
                                  <p className="font-medium">{li.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {li.sku && <span>{li.sku} · </span>}
                                    Qty: {li.quantity} · {fmt(li.lineTotal)}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
