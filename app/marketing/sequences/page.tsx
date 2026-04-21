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
import { listSequences } from "@/lib/services/marketing-service";
import { TRIGGER_LABELS } from "@/lib/schemas/marketing";
import { SequenceToggle } from "@/components/marketing/sequence-toggle";

export const dynamic = "force-dynamic";

export default async function SequencesListPage() {
  await requireSession();
  const sequences = await listSequences();

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          helpKey="sequences"
          eyebrow="Marketing"
          title="Email Sequences"
          description="Automated email sequences triggered by customer actions."
        />
        <Link href="/marketing/sequences/new">
          <Button>+ New Sequence</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Sequences ({sequences.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {sequences.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No sequences yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead className="text-center">Steps</TableHead>
                  <TableHead className="text-center">Active</TableHead>
                  <TableHead className="text-right">Enrolled</TableHead>
                  <TableHead className="text-right">Sent</TableHead>
                  <TableHead className="text-right">Open Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sequences.map((seq) => {
                  const totalSent = seq.steps.reduce((s, st) => s + st.sentCount, 0);
                  const totalOpens = seq.steps.reduce((s, st) => s + st.openCount, 0);
                  const openRate = totalSent > 0 ? Math.round((totalOpens / totalSent) * 100) : 0;

                  return (
                    <TableRow key={seq.id}>
                      <TableCell>
                        <Link
                          href={`/marketing/sequences/${seq.id}`}
                          className="font-medium text-primary underline-offset-4 hover:underline"
                        >
                          {seq.name}
                        </Link>
                        {seq.isPrebuilt && (
                          <Badge variant="outline" className="ml-2 text-[10px]">
                            Prebuilt
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {TRIGGER_LABELS[seq.trigger] ?? seq.trigger}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{seq.steps.length}</TableCell>
                      <TableCell className="text-center">
                        <SequenceToggle id={seq.id} isActive={seq.isActive} />
                      </TableCell>
                      <TableCell className="text-right">{seq._count.enrollments}</TableCell>
                      <TableCell className="text-right">{totalSent}</TableCell>
                      <TableCell className="text-right">{openRate}%</TableCell>
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
