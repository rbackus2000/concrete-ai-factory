import Link from "next/link";
import { notFound } from "next/navigation";

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
import { getCampaign } from "@/lib/services/marketing-service";

export const dynamic = "force-dynamic";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "secondary",
  SCHEDULED: "default",
  SENDING: "default",
  SENT: "outline",
  CANCELLED: "destructive",
};

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSession();
  const { id } = await params;
  const campaign = await getCampaign(id);

  if (!campaign) notFound();

  const openRate = campaign.sentCount > 0 ? Math.round((campaign.openCount / campaign.sentCount) * 100) : 0;
  const clickRate = campaign.sentCount > 0 ? Math.round((campaign.clickCount / campaign.sentCount) * 100) : 0;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          helpKey="campaigns-detail"
          eyebrow="Marketing"
          title={campaign.name}
          description={`Status: ${campaign.status} ${campaign.sentAt ? `| Sent: ${new Date(campaign.sentAt).toLocaleDateString()}` : ""}`}
        />
        <div className="flex gap-2">
          <Badge variant={STATUS_VARIANT[campaign.status] ?? "outline"} className="h-fit">
            {campaign.status}
          </Badge>
          {campaign.status === "DRAFT" && (
            <Link href={`/marketing/campaigns/${id}/edit`}>
              <Button variant="outline">Edit</Button>
            </Link>
          )}
        </div>
      </div>

      {/* Analytics cards */}
      <div className="grid gap-4 sm:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Sent</p>
            <p className="text-2xl font-bold">{campaign.sentCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Recipients</p>
            <p className="text-2xl font-bold">{campaign.recipientCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Opened</p>
            <p className={`text-2xl font-bold ${openRate >= 25 ? "text-amber-500" : ""}`}>
              {campaign.openCount} ({openRate}%)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Clicked</p>
            <p className="text-2xl font-bold">{campaign.clickCount} ({clickRate}%)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Unsubscribed</p>
            <p className="text-2xl font-bold">{campaign.unsubCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Recipient Log */}
      <Card>
        <CardHeader>
          <CardTitle>Recipient Log ({campaign.logs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {campaign.logs.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No emails sent yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contact</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Opened</TableHead>
                  <TableHead>Clicked</TableHead>
                  <TableHead>Unsubscribed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaign.logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <Link
                        href={`/contacts/${log.contact.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {log.contact.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{log.toEmail}</TableCell>
                    <TableCell className="text-sm">
                      {new Date(log.sentAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {log.openedAt ? (
                        <Badge variant="outline" className="text-[10px]">
                          {new Date(log.openedAt).toLocaleDateString()}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {log.clickedAt ? (
                        <Badge variant="outline" className="text-[10px]">
                          {new Date(log.clickedAt).toLocaleDateString()}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {log.unsubscribedAt ? (
                        <Badge variant="destructive" className="text-[10px]">Yes</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
