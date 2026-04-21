"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle, AlertCircle, Truck } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type QueueData = {
  ready: Array<{ id: string; orderNumber: string; contactName: string; items: string[]; status: string }>;
  blocked: Array<{ id: string; orderNumber: string; contactName: string; shortages: string[]; status: string }>;
  readyToShip: Array<{ id: string; orderNumber: string; contactName: string; items: string[]; status: string }>;
};

function QueueSkeleton() {
  return <div className="h-64 w-full animate-pulse rounded bg-muted" />;
}

export function ProductionQueueCard() {
  const [data, setData] = useState<QueueData | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/production-queue")
      .then((r) => r.json())
      .then((j) => setData(j.data))
      .catch(() => {});
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Production Queue — Today</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!data ? (
          <QueueSkeleton />
        ) : (
          <>
            {/* Ready to Build */}
            <div>
              <div className="mb-2 flex items-center gap-2">
                <CheckCircle className="size-4 text-green-600" />
                <p className="text-xs font-semibold uppercase tracking-wider text-green-700">Ready to Build ({data.ready.length})</p>
              </div>
              {data.ready.length === 0 ? (
                <p className="text-xs text-muted-foreground">No orders ready to build.</p>
              ) : (
                <div className="space-y-2">
                  {data.ready.slice(0, 5).map((o) => (
                    <Link key={o.id} href={`/orders/${o.id}`} className="block rounded-lg border p-2.5 transition hover:border-primary/40">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{o.orderNumber}</span>
                        <Badge variant="secondary" className="text-[10px]">{o.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{o.contactName} — {o.items.join(", ")}</p>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Blocked */}
            <div>
              <div className="mb-2 flex items-center gap-2">
                <AlertCircle className="size-4 text-red-500" />
                <p className="text-xs font-semibold uppercase tracking-wider text-red-600">Blocked — Material Shortage ({data.blocked.length})</p>
              </div>
              {data.blocked.length === 0 ? (
                <p className="text-xs text-muted-foreground">No material shortages.</p>
              ) : (
                <div className="space-y-2">
                  {data.blocked.slice(0, 5).map((o) => (
                    <div key={o.id} className="rounded-lg border border-red-200 p-2.5">
                      <div className="flex items-center justify-between">
                        <Link href={`/orders/${o.id}`} className="text-sm font-medium text-primary hover:underline">{o.orderNumber}</Link>
                        <span className="text-xs text-muted-foreground">{o.contactName}</span>
                      </div>
                      {o.shortages.map((s, i) => (
                        <p key={i} className="mt-1 text-xs text-red-600">Missing: {s}</p>
                      ))}
                    </div>
                  ))}
                  <Link href="/inventory/reorder">
                    <Button variant="outline" size="sm" className="mt-1 h-7 text-xs">View Reorder Report</Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Ready to Ship */}
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Truck className="size-4 text-blue-500" />
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Ready to Ship ({data.readyToShip.length})</p>
              </div>
              {data.readyToShip.length === 0 ? (
                <p className="text-xs text-muted-foreground">No orders ready to ship.</p>
              ) : (
                <div className="space-y-2">
                  {data.readyToShip.slice(0, 5).map((o) => (
                    <Link key={o.id} href={`/orders/${o.id}`} className="block rounded-lg border p-2.5 transition hover:border-primary/40">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{o.orderNumber}</span>
                        <Badge className="text-[10px]">Ship Now</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{o.contactName} — {o.items.join(", ")}</p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
