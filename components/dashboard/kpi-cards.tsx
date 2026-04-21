"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, DollarSign, FileWarning, Package, TrendingUp, Warehouse, AlertTriangle } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";

type KPIData = {
  revenueThisMonth: number;
  revenueLastMonth: number;
  outstanding: number;
  outstandingCount: number;
  overdue: number;
  overdueCount: number;
  activeOrders: number;
  readyToShipCount: number;
  inventoryValue: number;
  lowStockCount: number;
  pipelineValue: number;
  openQuoteCount: number;
};

function fmt(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function TrendArrow({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return null;
  const isUp = current >= previous;
  const pct = previous > 0 ? Math.round(((current - previous) / previous) * 100) : current > 0 ? 100 : 0;
  return (
    <span className={`flex items-center gap-1 text-xs ${isUp ? "text-green-600" : "text-red-500"}`}>
      {isUp ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
      {Math.abs(pct)}%
    </span>
  );
}

function KPISkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <div className="h-3 w-20 animate-pulse rounded bg-muted" />
          </CardHeader>
          <CardContent>
            <div className="h-8 w-24 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-3 w-16 animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function KPICards() {
  const [data, setData] = useState<KPIData | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/kpis")
      .then((r) => r.json())
      .then((j) => setData(j.data))
      .catch(() => {});
  }, []);

  if (!data) return <KPISkeleton />;

  const cards = [
    {
      label: "Revenue This Month",
      value: fmt(data.revenueThisMonth),
      trend: <TrendArrow current={data.revenueThisMonth} previous={data.revenueLastMonth} />,
      sub: "vs last month",
      icon: DollarSign,
      href: null,
      variant: "default" as const,
    },
    {
      label: "Outstanding",
      value: fmt(data.outstanding),
      trend: null,
      sub: `${data.outstandingCount} invoices unpaid`,
      icon: FileWarning,
      href: "/invoices",
      variant: "default" as const,
    },
    {
      label: "Overdue",
      value: fmt(data.overdue),
      trend: null,
      sub: `${data.overdueCount} invoices overdue`,
      icon: AlertTriangle,
      href: "/invoices",
      variant: (data.overdueCount > 0 ? "danger" : "default") as "danger" | "default",
    },
    {
      label: "Active Orders",
      value: String(data.activeOrders),
      trend: null,
      sub: `${data.readyToShipCount} ready to ship`,
      icon: Package,
      href: "/orders",
      variant: "default" as const,
    },
    {
      label: "Inventory Value",
      value: fmt(data.inventoryValue),
      trend: null,
      sub: `${data.lowStockCount} items low stock`,
      icon: Warehouse,
      href: "/inventory",
      variant: (data.lowStockCount > 0 ? "warning" : "default") as "warning" | "default",
    },
    {
      label: "Pipeline Value",
      value: fmt(data.pipelineValue),
      trend: null,
      sub: `${data.openQuoteCount} quotes open`,
      icon: TrendingUp,
      href: "/quotes",
      variant: "default" as const,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {cards.map((card) => {
        const Icon = card.icon;
        const borderClass = card.variant === "danger"
          ? "border-red-500/30"
          : card.variant === "warning"
            ? "border-amber-500/30"
            : "";

        const inner = (
          <Card className={`transition hover:border-primary/40 ${borderClass}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
              <Icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold">{card.value}</p>
                {card.trend}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{card.sub}</p>
            </CardContent>
          </Card>
        );

        return card.href ? (
          <Link key={card.label} href={card.href as never}>{inner}</Link>
        ) : (
          <div key={card.label}>{inner}</div>
        );
      })}
    </div>
  );
}
