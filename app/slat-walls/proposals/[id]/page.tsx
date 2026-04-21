import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/app-shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getProposalDetail } from "@/app/actions/proposal-actions";
import ProposalStatusActions from "./proposal-status-actions";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function ProposalDetailPage({ params }: Props) {
  const { id } = await params;
  const proposal = await getProposalDetail(id);
  if (!proposal) notFound();

  const isExpired = proposal.validUntil ? new Date(proposal.validUntil) < new Date() : false;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          eyebrow="Proposals"
          title={proposal.proposalNumber}
          description={`${proposal.projectName} — ${proposal.clientName}`}
          helpKey="slat-walls-proposals-detail"
        />
        <Link href="/slat-walls/proposals">
          <Button variant="outline">Back to Proposals</Button>
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <Badge variant={proposal.status === "ACCEPTED" ? "default" : "secondary"} className="text-sm">{proposal.status}</Badge>
        {isExpired && <Badge variant="warning">Expired</Badge>}
        <ProposalStatusActions proposalId={proposal.id} currentStatus={proposal.status} />
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader><CardTitle>Client</CardTitle></CardHeader>
          <CardContent>
            <p className="font-medium">{proposal.clientName}</p>
            {proposal.clientEmail && <p className="text-sm text-muted-foreground">{proposal.clientEmail}</p>}
            {proposal.siteAddress && <p className="text-sm text-muted-foreground">{proposal.siteAddress}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Wall Size</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{proposal.wallSize}</p>
            <p className="text-sm text-muted-foreground">{proposal.slatCount} slats</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Client Price</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${proposal.clientPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <p className="text-sm text-muted-foreground">{proposal.printMethod} print</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Valid Until</CardTitle></CardHeader>
          <CardContent>
            <p className={isExpired ? "text-red-600 font-medium" : ""}>
              {proposal.validUntil ? new Date(proposal.validUntil).toLocaleDateString() : "No expiry"}
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Specification</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Scenario</span><span>{proposal.scenarioId}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Slat Width</span><span>{proposal.slatWidthIn}&quot;</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Slat Height</span><span>{proposal.slatHeightFt} ft</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Print Method</span><span>{proposal.printMethod}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Includes Install</span><span>{proposal.includeInstall ? "Yes" : "No"}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Timeline</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Created</span><span>{new Date(proposal.createdAt).toLocaleDateString()}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Sent</span><span>{proposal.sentAt ? new Date(proposal.sentAt).toLocaleDateString() : "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Viewed</span><span>{proposal.viewedAt ? new Date(proposal.viewedAt).toLocaleDateString() : "—"}</span></div>
          </CardContent>
        </Card>
      </section>

      {proposal.breakdown && Object.keys(proposal.breakdown).length > 0 && (
        <Card>
          <CardHeader><CardTitle>Cost Breakdown</CardTitle></CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-xs text-muted-foreground bg-muted p-4 rounded-lg">
              {JSON.stringify(proposal.breakdown, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
