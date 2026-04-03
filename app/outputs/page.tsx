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
import { outputTypeValues } from "@/lib/schemas/domain";
import { listGeneratedOutputs } from "@/lib/services/generated-output-service";

export const dynamic = "force-dynamic";

type OutputsPageProps = {
  searchParams: Promise<{
    skuCode?: string;
    outputType?: string;
  }>;
};

export default async function OutputsPage({ searchParams }: OutputsPageProps) {
  const { skuCode, outputType } = await searchParams;
  const history = await listGeneratedOutputs({ skuCode, outputType });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Outputs"
        title="Generated output history"
        description="Inspect saved prompt, packet, and calculation outputs by SKU before adding export workflows."
      />

      <Card className="border-white/70 bg-white/85 shadow-panel backdrop-blur">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-wrap items-end gap-3" method="get">
            <label className="space-y-2">
              <span className="text-sm text-muted-foreground">SKU</span>
              <select
                className="flex h-11 min-w-[220px] rounded-2xl border border-input bg-white px-4 py-2 text-sm"
                defaultValue={history.selectedSkuCode}
                name="skuCode"
              >
                <option value="">All SKUs</option>
                {history.skus.map((sku) => (
                  <option key={sku.code} value={sku.code}>
                    {sku.code} · {sku.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm text-muted-foreground">Output Type</span>
              <select
                className="flex h-11 min-w-[220px] rounded-2xl border border-input bg-white px-4 py-2 text-sm"
                defaultValue={history.selectedOutputType}
                name="outputType"
              >
                <option value="">All Types</option>
                {outputTypeValues.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
              type="submit"
            >
              Apply
            </button>
            <a
              className="inline-flex h-11 items-center justify-center rounded-full border border-border bg-transparent px-5 py-2.5 text-sm font-medium"
              href="/outputs"
            >
              Clear
            </a>
          </form>
        </CardContent>
      </Card>

      {history.outputs.length > 0 ? (
        <Card className="border-white/70 bg-white/85 shadow-panel backdrop-blur">
          <CardHeader>
            <CardTitle>Saved Outputs</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]"></TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Open</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.outputs.map((output) => (
                  <TableRow key={output.id}>
                    <TableCell>
                      {output.imageUrl ? (
                        <img
                          alt=""
                          className="h-10 w-10 rounded-lg object-cover"
                          src={output.imageUrl}
                        />
                      ) : null}
                    </TableCell>
                    <TableCell className="font-medium">{output.skuCode}</TableCell>
                    <TableCell>{output.title}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{output.outputType}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{output.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(output.createdAt).toLocaleString()}</TableCell>
                    <TableCell>
                      <Link
                        className="text-primary underline-offset-4 hover:underline font-medium"
                        href={`/outputs/${output.id}`}
                      >
                        View
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
          title="No generated outputs yet"
          description="Run the generator or calculator first to save prompt, packet, or calculation outputs for inspection."
        />
      )}
    </div>
  );
}
