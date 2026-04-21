import Link from "next/link";

import { PageHeader } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireSession } from "@/lib/auth/session";
import { listCampaigns } from "@/lib/services/marketing-service";

export const dynamic = "force-dynamic";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "secondary",
  SCHEDULED: "default",
  SENDING: "default",
  SENT: "outline",
  CANCELLED: "destructive",
};

export default async function CampaignsListPage() {
  await requireSession();
  const campaigns = await listCampaigns();

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          helpKey="campaigns"
          eyebrow="Marketing"
          title="Campaigns"
          description="One-time broadcast emails to a targeted segment of contacts."
        />
        <Link href="/marketing/campaigns/new">
          <Button>+ New Campaign</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Campaigns ({campaigns.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No campaigns yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Segment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Sent</TableHead>
                  <TableHead className="text-right">Open Rate</TableHead>
                  <TableHead className="text-right">Scheduled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((c) => {
                  const openRate = c.sentCount > 0 ? Math.round((c.openCount / c.sentCount) * 100) : 0;
                  return (
                    <TableRow key={c.id}>
                      <TableCell>
                        <Link
                          href={`/marketing/campaigns/${c.id}`}
                          className="font-medium text-primary underline-offset-4 hover:underline"
                        >
                          {c.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{c.segmentType}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[c.status] ?? "outline"}>
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{c.sentCount}</TableCell>
                      <TableCell className="text-right">{openRate}%</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {c.scheduledAt
                          ? new Date(c.scheduledAt).toLocaleDateString()
                          : c.sentAt
                            ? new Date(c.sentAt).toLocaleDateString()
                            : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
