import Link from "next/link";

import { PageHeader } from "@/components/app-shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listLaborRates } from "@/lib/services/labor-rate-service";

export const dynamic = "force-dynamic";

export default async function LaborRatesPage() {
  const rates = await listLaborRates();

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <PageHeader eyebrow="Admin" title="Labor Rates" description="Manage shop labor rates used for product costing and quotes." />
        <Link href="/admin/labor-rates/new"><Button>Add Rate</Button></Link>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Rate</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>SKUs</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rates.map((r) => (
            <TableRow key={r.id}>
              <TableCell>
                <Link className="font-medium text-primary hover:underline" href={`/admin/labor-rates/${r.id}`}>
                  {r.code}
                </Link>
              </TableCell>
              <TableCell className="font-medium">
                {r.name}
                {r.isDefault && <Badge variant="outline" className="ml-2">Default</Badge>}
              </TableCell>
              <TableCell className="font-mono font-semibold">${r.hourlyRate.toFixed(2)}/hr</TableCell>
              <TableCell className="max-w-xs truncate text-xs text-muted-foreground">{r.description || "—"}</TableCell>
              <TableCell>{r.skuCount}</TableCell>
              <TableCell><Badge variant={r.status === "ACTIVE" ? "default" : "secondary"}>{r.status}</Badge></TableCell>
            </TableRow>
          ))}
          {rates.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                No labor rates defined yet. Add your shop rates to enable labor costing.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
