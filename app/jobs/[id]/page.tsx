import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/app-shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getJobDetail } from "@/lib/services/job-service";
import { decimalToNumber } from "@/lib/services/service-helpers";

export const dynamic = "force-dynamic";

type JobDetailPageProps = { params: Promise<{ id: string }> };

export default async function JobDetailPage({ params }: JobDetailPageProps) {
  const { id } = await params;
  const job = await getJobDetail(id);
  if (!job) notFound();

  const retailTotal = decimalToNumber(job.retailPriceTotal);
  const wholesaleTotal = decimalToNumber(job.wholesalePriceTotal);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          eyebrow="Jobs"
          title={job.jobNumber}
          description={`${job.sku.code} — ${job.sku.name} x${job.quantity}`}
          helpKey="jobs-detail"
        />
        <Link href="/jobs"><Button variant="outline">Back to Jobs</Button></Link>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader><CardTitle>Status</CardTitle></CardHeader>
          <CardContent><Badge>{job.status.replace("_", " ")}</Badge></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>SKU</CardTitle></CardHeader>
          <CardContent>
            <Link className="font-medium text-primary hover:underline" href={`/skus/${job.sku.code}`}>
              {job.sku.code} — {job.sku.name}
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Quantity</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{job.quantity}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Due Date</CardTitle></CardHeader>
          <CardContent>
            <p>{job.dueDate ? new Date(job.dueDate).toLocaleDateString() : "Not set"}</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {job.client && (
          <Card>
            <CardHeader><CardTitle>Client</CardTitle></CardHeader>
            <CardContent>
              <p className="font-medium">{job.client.name}</p>
              {job.client.company && <p className="text-sm text-muted-foreground">{job.client.company}</p>}
              {job.client.email && <p className="text-sm text-muted-foreground">{job.client.email}</p>}
              {job.client.phone && <p className="text-sm text-muted-foreground">{job.client.phone}</p>}
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader><CardTitle>Pricing</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            <p className="text-sm"><span className="text-muted-foreground">Retail total:</span> {retailTotal ? `$${retailTotal.toFixed(2)}` : "Not set"}</p>
            <p className="text-sm"><span className="text-muted-foreground">Wholesale total:</span> {wholesaleTotal ? `$${wholesaleTotal.toFixed(2)}` : "Not set"}</p>
          </CardContent>
        </Card>
      </section>

      {job.notes && (
        <Card>
          <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
          <CardContent><p className="whitespace-pre-wrap text-sm">{job.notes}</p></CardContent>
        </Card>
      )}
    </div>
  );
}
