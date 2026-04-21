"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ChartData = {
  months: Array<{ month: string; revenue: number; costs: number; net: number }>;
  totalRevenue: number;
  totalCosts: number;
  totalNet: number;
  margin: number;
};

function fmt(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}

function ChartSkeleton() {
  return <div className="h-72 w-full animate-pulse rounded bg-muted" />;
}

export function RevenueChart() {
  const [data, setData] = useState<ChartData | null>(null);
  const [period, setPeriod] = useState("12m");

  useEffect(() => {
    fetch(`/api/dashboard/revenue-chart?period=${period}`)
      .then((r) => r.json())
      .then((j) => setData(j.data))
      .catch(() => {});
  }, [period]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Revenue vs Expenses</CardTitle>
        <div className="flex gap-1">
          {["12m", "6m"].map((p) => (
            <Button
              key={p}
              variant={period === p ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setPeriod(p)}
            >
              {p === "12m" ? "This Year" : "Last 6 Months"}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {!data ? (
          <ChartSkeleton />
        ) : (
          <>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={data.months} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(220 9% 46%)" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(220 9% 46%)" }} tickFormatter={(v) => fmt(v)} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(0 0% 100%)",
                    border: "1px solid hsl(220 13% 91%)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value) => [`$${Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, undefined]}
                />
                <Bar dataKey="revenue" name="Revenue" fill="#c8a96e" radius={[3, 3, 0, 0]} />
                <Bar dataKey="costs" name="Costs" fill="#4a4a4a" radius={[3, 3, 0, 0]} />
                <Line dataKey="net" name="Net" type="monotone" stroke="#c8a96e" strokeWidth={2} dot={false} strokeDasharray="5 5" />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-3 gap-4 border-t pt-4">
              <div>
                <p className="text-xs text-muted-foreground">Total Revenue</p>
                <p className="text-lg font-semibold">${data.totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Costs</p>
                <p className="text-lg font-semibold">${data.totalCosts.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Net Profit</p>
                <p className="text-lg font-semibold">
                  ${data.totalNet.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
                  <span className="text-xs font-normal text-muted-foreground">({data.margin}%)</span>
                </p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
