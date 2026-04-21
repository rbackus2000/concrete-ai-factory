import Link from "next/link";
import type { POStatus } from "@prisma/client";

import { PageHeader } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StateCard } from "@/components/ui/state-card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { requireSession } from "@/lib/auth/session";
import { listPurchaseOrders, getPOStats } from "@/lib/services/purchase-order-service";
import { POStatusBadge } from "@/components/inventory/po-status-badge";
import type { POStatusType } from "@/lib/schemas/inventory";

export const dynamic = "force-dynamic";

function fmt(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(date: Date | string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function PurchaseOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string }>;
}) {
  await requireSession();
  const params = await searchParams;

  const [pos, stats] = await Promise.all([
    listPurchaseOrders({
      status: (params.status as POStatus) || undefined,
      search: params.search || undefined,
    }),
    getPOStats(),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          helpKey="purchase-orders"
          eyebrow="Operations"
          title="Purchase Orders"
          description="Manage vendor purchase orders and track deliveries."
        />
        <Link href="/purchase-orders/new">
          <Button>New Purchase Order</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Open POs</p>
            <p className="text-2xl font-bold">{stats.openCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Partially Received</p>
            <p className="text-2xl font-bold text-amber-600">{stats.partialCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Expected This Week</p>
            <p className="text-2xl font-bold">{stats.expectedThisWeek}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total on Order</p>
            <p className="text-2xl font-bold">{fmt(stats.totalOnOrder)}</p>
          </CardContent>
        </Card>
      </div>

      {pos.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Purchase Orders ({pos.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO #</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expected</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pos.map((po) => (
                  <TableRow key={po.id}>
                    <TableCell className="font-medium">
                      <Link className="text-primary underline-offset-4 hover:underline" href={`/purchase-orders/${po.id}`}>
                        {po.poNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{po.vendor}</TableCell>
                    <TableCell>{po._count.items}</TableCell>
                    <TableCell className="text-right">{fmt(po.total)}</TableCell>
                    <TableCell>
                      <POStatusBadge status={po.status as POStatusType} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {fmtDate(po.expectedDelivery)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <StateCard
          title="No purchase orders yet"
          description="Create a purchase order to track material orders from your vendors."
          action={
            <Link href="/purchase-orders/new">
              <Button>Create First PO</Button>
            </Link>
          }
        />
      )}
    </div>
  );
}
