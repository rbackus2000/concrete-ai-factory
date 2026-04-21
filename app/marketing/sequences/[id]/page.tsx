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
import { getSequenceAnalytics } from "@/lib/services/marketing-service";
import { TRIGGER_LABELS } from "@/lib/schemas/marketing";

export const dynamic = "force-dynamic";

const ENROLLMENT_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ACTIVE: "default",
  PAUSED: "secondary",
  COMPLETED: "outline",
  UNENROLLED: "destructive",
};

export default async function SequenceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSession();
  const { id } = await params;
  const data = await getSequenceAnalytics(id);

  if (!data) notFound();
  const { sequence, enrolledCount, totalSent, openRate, conversionRate } = data;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          eyebrow="Marketing"
          title={sequence.name}
          description={TRIGGER_LABELS[sequence.trigger] ?? sequence.trigger}
        />
        <div className="flex gap-2">
          <Badge variant={sequence.isActive ? "default" : "secondary"} className="h-fit">
            {sequence.isActive ? "Active" : "Paused"}
          </Badge>
          <Link href={`/marketing/sequences/${id}/edit`}>
            <Button variant="outline">Edit</Button>
          </Link>
        </div>
      </div>

      {/* Analytics cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Enrolled</p>
            <p className="text-2xl font-bold">{enrolledCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Sent</p>
            <p className="text-2xl font-bold">{totalSent}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Open Rate</p>
            <p className={`text-2xl font-bold ${openRate >= 25 ? "text-amber-500" : ""}`}>
              {openRate}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Conversion Rate</p>
            <p className="text-2xl font-bold">{conversionRate}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Step Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Step Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Step</TableHead>
                <TableHead>Delay</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead className="text-right">Sent</TableHead>
                <TableHead className="text-right">Opened</TableHead>
                <TableHead className="text-right">Open %</TableHead>
                <TableHead className="text-right">Clicked</TableHead>
                <TableHead className="text-right">Click %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sequence.steps.map((step) => {
                const stepOpenRate = step.sentCount > 0 ? Math.round((step.openCount / step.sentCount) * 100) : 0;
                const stepClickRate = step.sentCount > 0 ? Math.round((step.clickCount / step.sentCount) * 100) : 0;
                return (
                  <TableRow key={step.id}>
                    <TableCell>
                      <Badge variant="outline">Step {step.stepNumber}</Badge>
                    </TableCell>
                    <TableCell>{step.delayDays}d</TableCell>
                    <TableCell className="max-w-[200px] truncate">{step.subject}</TableCell>
                    <TableCell className="text-right">{step.sentCount}</TableCell>
                    <TableCell className="text-right">{step.openCount}</TableCell>
                    <TableCell className="text-right">{stepOpenRate}%</TableCell>
                    <TableCell className="text-right">{step.clickCount}</TableCell>
                    <TableCell className="text-right">{stepClickRate}%</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
