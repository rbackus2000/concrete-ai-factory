import Link from "next/link";

import { PageHeader } from "@/components/app-shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listProposals } from "@/app/actions/proposal-actions";

export const dynamic = "force-dynamic";

export default async function ProposalsPage() {
  const proposals = await listProposals();

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          eyebrow="Slat Walls"
          title="Proposals"
          description="Client-facing proposal history for SW-01 installations."
        />
        <Link href="/slat-walls/proposals/new">
          <Button>New Proposal</Button>
        </Link>
      </div>

      <Card>
        <CardHeader><CardTitle>Proposal History</CardTitle></CardHeader>
        <CardContent>
          {proposals.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proposal</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Wall Size</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Valid Until</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proposals.map((p) => {
                  const isExpiring = p.validUntil && new Date(p.validUntil) < new Date(Date.now() + 7 * 86400000);
                  const isExpired = p.validUntil && new Date(p.validUntil) < new Date();
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.proposalNumber}</TableCell>
                      <TableCell>{p.clientName}</TableCell>
                      <TableCell>{p.projectName}</TableCell>
                      <TableCell>{p.wallSize}</TableCell>
                      <TableCell className="font-medium">${p.clientPrice.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={p.status === "DRAFT" ? "secondary" : "default"}>{p.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {p.validUntil ? (
                          <span className={isExpired ? "text-red-600" : isExpiring ? "text-amber-600" : ""}>
                            {new Date(p.validUntil).toLocaleDateString()}
                            {isExpired ? " (expired)" : isExpiring ? " (expiring)" : ""}
                          </span>
                        ) : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">No proposals generated yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
