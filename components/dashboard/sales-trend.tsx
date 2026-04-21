"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type TrendRow = {
  month: string;
  quotesSent: number;
  quotesSigned: number;
  revenue: number;
};

function ChartSkeleton() {
  return <div className="h-64 w-full animate-pulse rounded bg-muted" />;
}

export function SalesTrendChart() {
  const [data, setData] = useState<TrendRow[] | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/sales-trend")
      .then((r) => r.json())
      .then((j) => setData(j.data))
      .catch(() => {});
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Quotes & Revenue Pipeline</CardTitle>
      </CardHeader>
      <CardContent>
        {!data ? (
          <ChartSkeleton />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(220 9% 46%)" }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "hsl(220 9% 46%)" }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "hsl(220 9% 46%)" }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
              <Tooltip
                contentStyle={{
                  background: "hsl(0 0% 100%)",
                  border: "1px solid hsl(220 13% 91%)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Line yAxisId="left" dataKey="quotesSent" name="Quotes Sent" type="monotone" stroke="#c8a96e" strokeWidth={2} dot={{ r: 3 }} />
              <Line yAxisId="left" dataKey="quotesSigned" name="Quotes Signed" type="monotone" stroke="#8a7a5e" strokeWidth={2} dot={{ r: 3 }} />
              <Line yAxisId="right" dataKey="revenue" name="Revenue ($)" type="monotone" stroke="#4a4a4a" strokeWidth={2} strokeDasharray="5 5" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
