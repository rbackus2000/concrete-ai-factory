import Link from "next/link";

import { PageHeader } from "@/components/app-shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StateCard } from "@/components/ui/state-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getSkus } from "@/lib/services/sku-service";

export const dynamic = "force-dynamic";

export default async function SkusPage() {
  const skus = await getSkus();

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          eyebrow="SKU Library"
          title="SKU master list"
          description="Prisma-backed SKU records ready for richer CRUD, approvals, costing, and production planning."
        />
        <Link href="/skus/new"><Button>Create SKU</Button></Link>
      </div>

      {skus.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Current SKUs</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Finish</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Target Weight</TableHead>
                  <TableHead>Batch Qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {skus.map((sku) => (
                  <TableRow key={sku.code}>
                    <TableCell className="font-medium">
                      <Link className="text-primary underline-offset-4 hover:underline" href={`/skus/${sku.code}`}>
                        {sku.code}
                      </Link>
                    </TableCell>
                    <TableCell>{sku.name}</TableCell>
                    <TableCell>{sku.category}</TableCell>
                    <TableCell>{sku.finish}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{sku.status}</Badge>
                    </TableCell>
                    <TableCell>{sku.targetWeight.min}-{sku.targetWeight.max} lbs</TableCell>
                    <TableCell>
                      {sku.calculatorDefaults.unitsToProduce > 1 ? (
                        <Badge variant="outline">{sku.calculatorDefaults.unitsToProduce} units</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">1</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <StateCard
          title="No SKUs yet"
          description="Seed the database or create the first SKU record before using generator, packet, and calculator flows."
        />
      )}
    </div>
  );
}
