import Link from "next/link";

import { PageHeader } from "@/components/app-shell/page-header";
import { Badge } from "@/components/ui/badge";
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

export default async function PacketsPage() {
  const skus = await getSkus();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Packets"
        title="Build packet previews"
        description="Select a SKU to preview the assembled build packet from templates, rules, and QC gates."
      />

      {skus.length > 0 ? (
        <Card className="border-white/70 bg-white/85 shadow-panel backdrop-blur">
          <CardHeader>
            <CardTitle>SKU Packets</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Finish</TableHead>
                  <TableHead>Target Weight</TableHead>
                  <TableHead>Packet</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {skus.map((sku) => (
                  <TableRow key={sku.code}>
                    <TableCell className="font-medium">{sku.code}</TableCell>
                    <TableCell>{sku.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{sku.category}</Badge>
                    </TableCell>
                    <TableCell>{sku.finish}</TableCell>
                    <TableCell>{sku.targetWeight.min}-{sku.targetWeight.max} lbs</TableCell>
                    <TableCell>
                      <Link
                        className="text-primary underline-offset-4 hover:underline font-medium"
                        href={`/packets/${sku.code}`}
                      >
                        View packet
                      </Link>
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
          description="Seed the database or create the first SKU record before viewing build packets."
        />
      )}
    </div>
  );
}
