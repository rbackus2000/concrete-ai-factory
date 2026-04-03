import Link from "next/link";

import { PageHeader } from "@/components/app-shell/page-header";
import { buttonVariants } from "@/components/ui/button";
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

export const dynamic = "force-dynamic";

export default async function MaterialsMasterPage() {
  const records = await listMaterialsMaster();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="Materials master"
        description="Manage reusable material baselines used by the calculator and future production costing layers."
      />

      <div className="flex justify-end">
        <Link className={buttonVariants()} href="/admin/materials-master/new">
          Create material
        </Link>
      </div>

      <Card className="border-white/70 bg-white/85 shadow-panel backdrop-blur">
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
                <TableHead>Quantity</TableHead>
                <TableHead>Unit Cost</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Open</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>{record.code}</TableCell>
                  <TableCell className="font-medium">{record.name}</TableCell>
                  <TableCell>{record.category}</TableCell>
                  <TableCell>
                    {record.quantity} {record.unit}
                  </TableCell>
                  <TableCell>${record.unitCost}</TableCell>
                  <TableCell>{record.status}</TableCell>
                  <TableCell>{record.scopeLabel}</TableCell>
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
