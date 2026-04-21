import Link from "next/link";
import type { InventoryType } from "@prisma/client";

import { PageHeader } from "@/components/app-shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StateCard } from "@/components/ui/state-card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { requireSession } from "@/lib/auth/session";
import { listInventoryItems, getInventoryStats } from "@/lib/services/inventory-service";
import { InventoryTypeBadge } from "@/components/inventory/inventory-type-badge";
import { InventoryFilters } from "@/components/inventory/inventory-filters";
import { SyncInventoryButton } from "@/components/inventory/sync-inventory-button";
import type { InventoryTypeValue } from "@/lib/schemas/inventory";

export const dynamic = "force-dynamic";

function fmt(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; status?: string; search?: string }>;
}) {
  await requireSession();
  const params = await searchParams;

  const [items, stats] = await Promise.all([
    listInventoryItems({
      type: (params.type as InventoryType) || undefined,
      search: params.search || undefined,
      status: params.status || undefined,
    }),
    getInventoryStats(),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          helpKey="inventory"
          eyebrow="Operations"
          title="Inventory"
          description="Track finished products and raw materials. Scan barcodes, manage stock levels, and reorder."
          stats={`${stats.totalItems} items | ${fmt(stats.totalValue)} total value | ${stats.lowStockCount} low stock`}
        />
        <div className="flex items-center gap-2">
          <Link href="/inventory/scan">
            <Button variant="outline">Scanner</Button>
          </Link>
          <Link href="/inventory/new">
            <Button>Add Item</Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Items</p>
            <p className="text-2xl font-bold">{stats.totalItems}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Value</p>
            <p className="text-2xl font-bold">{fmt(stats.totalValue)}</p>
            <p className="text-xs text-muted-foreground">
              Finished {fmt(stats.finishedValue)} / Raw {fmt(stats.rawValue)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Low Stock</p>
            <p className={`text-2xl font-bold ${stats.lowStockCount > 0 ? "text-red-600" : ""}`}>
              {stats.lowStockCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Items on Order</p>
            <p className="text-2xl font-bold">{stats.onOrderCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/inventory/labels"><Button variant="outline" size="sm">Print Labels</Button></Link>
        <Link href="/inventory/count"><Button variant="outline" size="sm">Cycle Count</Button></Link>
        <Link href="/inventory/reorder"><Button variant="outline" size="sm">Reorder Report</Button></Link>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/api/inventory/export"><Button variant="outline" size="sm">Export CSV</Button></a>
        <SyncInventoryButton />
      </div>

      <InventoryFilters
        currentType={params.type}
        currentStatus={params.status}
        currentSearch={params.search}
      />

      {items.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {params.type
                ? params.type === "FINISHED_PRODUCT" ? "Finished Products" : "Raw Materials"
                : "All Items"}{" "}
              ({items.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">On Hand</TableHead>
                  <TableHead className="text-right">Reserved</TableHead>
                  <TableHead className="text-right">Available</TableHead>
                  <TableHead className="text-right">Reorder At</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Link
                        className="font-medium text-primary underline-offset-4 hover:underline"
                        href={`/inventory/${item.id}`}
                      >
                        {item.name}
                      </Link>
                      {item.sku && (
                        <div className="text-xs text-muted-foreground">{item.sku}</div>
                      )}
                      {item.isLowStock && (
                        <Badge variant="destructive" className="ml-1 text-[10px]">Low Stock</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <InventoryTypeBadge type={item.type as InventoryTypeValue} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{item.category || "—"}</TableCell>
                    <TableCell className="text-right font-medium">{item.qtyOnHand}</TableCell>
                    <TableCell className="text-right">{item.qtyReserved || "—"}</TableCell>
                    <TableCell className="text-right">{item.qtyAvailable}</TableCell>
                    <TableCell className="text-right">{item.reorderPoint || "—"}</TableCell>
                    <TableCell className="text-right">{fmt(item.costPerUnit)}</TableCell>
                    <TableCell className="text-right font-medium">{fmt(item.totalValue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <StateCard
          title="No inventory items yet"
          description="Sync from your Materials Master and SKU catalog, or add items manually."
          action={
            <div className="flex items-center gap-2">
              <SyncInventoryButton />
              <Link href="/inventory/new">
                <Button variant="outline">Add Manually</Button>
              </Link>
            </div>
          }
        />
      )}
    </div>
  );
}
