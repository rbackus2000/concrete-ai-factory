"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type HealthData = {
  rawMaterials: Array<{
    name: string;
    qtyOnHand: number;
    reorderPoint: number;
    percentAboveReorder: number;
    isLowStock: boolean;
  }>;
  finishedProducts: Array<{
    name: string;
    qtyOnHand: number;
    qtyReserved: number;
    qtyAvailable: number;
    isLowStock: boolean;
  }>;
};

function ChartSkeleton() {
  return <div className="h-48 w-full animate-pulse rounded bg-muted" />;
}

export function InventoryHealthCard() {
  const [data, setData] = useState<HealthData | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/inventory-health")
      .then((r) => r.json())
      .then((j) => setData(j.data))
      .catch(() => {});
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Inventory Health</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {!data ? (
          <ChartSkeleton />
        ) : (
          <>
            {/* Raw Materials */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Raw Materials</p>
              {data.rawMaterials.length === 0 ? (
                <p className="text-xs text-muted-foreground">No raw materials tracked.</p>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(120, data.rawMaterials.slice(0, 8).length * 32)}>
                  <BarChart
                    data={data.rawMaterials.slice(0, 8)}
                    layout="vertical"
                    margin={{ top: 0, right: 10, bottom: 0, left: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(220 9% 46%)" }} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "hsl(220 9% 46%)" }} width={90} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(0 0% 100%)",
                        border: "1px solid hsl(220 13% 91%)",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Bar
                      dataKey="qtyOnHand"
                      name="On Hand"
                      fill="#c8a96e"
                      radius={[0, 3, 3, 0]}
                    />
                    <ReferenceLine x={0} stroke="transparent" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Finished Products */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Finished Products</p>
              {data.finishedProducts.length === 0 ? (
                <p className="text-xs text-muted-foreground">No finished products tracked.</p>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(120, data.finishedProducts.slice(0, 8).length * 32)}>
                  <BarChart
                    data={data.finishedProducts.slice(0, 8)}
                    layout="vertical"
                    margin={{ top: 0, right: 10, bottom: 0, left: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(220 9% 46%)" }} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "hsl(220 9% 46%)" }} width={90} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(0 0% 100%)",
                        border: "1px solid hsl(220 13% 91%)",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="qtyOnHand" name="On Hand" fill="#c8a96e" radius={[0, 3, 3, 0]} />
                    <Bar dataKey="qtyReserved" name="Reserved" fill="#4a4a4a" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
