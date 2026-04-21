import Link from "next/link";

import { PageHeader } from "@/components/app-shell/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listMaterialsMaster } from "@/lib/services/admin-service";
import { SyncAllPricesButton } from "./sync-all-button";

export const dynamic = "force-dynamic";

export default async function MaterialsMasterPage() {
  const records = await listMaterialsMaster();
  const hasScrapable = records.some((r) => r.supplierName);

  return (
    <div className="space-y-8">
      <PageHeader
        helpKey="admin-materials-master"
        eyebrow="Admin"
        title="Materials master"
        description="Manage reusable material baselines used by the calculator and future production costing layers."
      />

      <div className="flex items-center justify-end gap-3">
        {hasScrapable && <SyncAllPricesButton />}
        <Link className={buttonVariants()} href="/admin/materials-master/new">
          Create material
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Material Records</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Unit Cost</TableHead>
                <TableHead>Last Priced</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Open</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-mono text-xs">{record.code}</TableCell>
                  <TableCell className="font-medium">{record.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{record.category}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {record.supplierName ?? "—"}
                  </TableCell>
                  <TableCell>
                    {record.quantity} {record.unit}
                  </TableCell>
                  <TableCell>${record.unitCost}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {record.lastPricedAt
                      ? new Date(record.lastPricedAt).toLocaleDateString()
                      : "—"}
                  </TableCell>
                  <TableCell>{record.status}</TableCell>
                  <TableCell className="text-xs">{record.scopeLabel}</TableCell>
                  <TableCell>
                    <Link className="text-primary underline-offset-4 hover:underline" href={`/admin/materials-master/${record.id}`}>
                      Edit
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
