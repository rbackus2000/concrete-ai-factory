import Link from "next/link";

import { PageHeader } from "@/components/app-shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listSuppliers } from "@/lib/services/supplier-service";

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  const suppliers = await listSuppliers();

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <PageHeader helpKey="admin-suppliers" eyebrow="Admin" title="Suppliers" description="Manage material suppliers, product URLs, and pricing sources." />
        <Link href="/admin/suppliers/new"><Button>Add Supplier</Button></Link>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Website</TableHead>
            <TableHead>Materials</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {suppliers.map((s) => (
            <TableRow key={s.id}>
              <TableCell>
                <Link className="font-medium text-primary hover:underline" href={`/admin/suppliers/${s.id}`}>
                  {s.code}
                </Link>
              </TableCell>
              <TableCell className="font-medium">{s.name}</TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {s.website ? (
                  <a href={s.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {new URL(s.website).hostname}
                  </a>
                ) : "—"}
              </TableCell>
              <TableCell>{s.materialCount}</TableCell>
              <TableCell><Badge variant={s.status === "ACTIVE" ? "default" : "secondary"}>{s.status}</Badge></TableCell>
            </TableRow>
          ))}
          {suppliers.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                No suppliers yet. Add your first supplier to start tracking material sources.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
