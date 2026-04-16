"use client";

import { useTransition } from "react";
import { ArrowRight, Calendar, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { updateJobStatusAction } from "@/app/actions/job-actions";

type JobRow = {
  id: string;
  jobNumber: string;
  quantity: number;
  status: string;
  dueDate: string | null;
  sku: { code: string; name: string; category: string };
  client: { name: string; company: string | null } | null;
};

type JobKanbanProps = {
  columns: Record<string, JobRow[]>;
};

const STATUS_ORDER = ["QUOTED", "IN_PRODUCTION", "QC", "READY", "SHIPPED", "DELIVERED"] as const;

const STATUS_LABELS: Record<string, string> = {
  QUOTED: "Quoted",
  IN_PRODUCTION: "In Production",
  QC: "Quality Check",
  READY: "Ready",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
};

const STATUS_COLORS: Record<string, string> = {
  QUOTED: "bg-blue-50 border-blue-200 text-blue-700",
  IN_PRODUCTION: "bg-amber-50 border-amber-200 text-amber-700",
  QC: "bg-purple-50 border-purple-200 text-purple-700",
  READY: "bg-green-50 border-green-200 text-green-700",
  SHIPPED: "bg-indigo-50 border-indigo-200 text-indigo-700",
  DELIVERED: "bg-zinc-50 border-zinc-200 text-zinc-500",
};

function nextStatus(current: string): string | null {
  const idx = STATUS_ORDER.indexOf(current as typeof STATUS_ORDER[number]);
  if (idx < 0 || idx >= STATUS_ORDER.length - 1) return null;
  return STATUS_ORDER[idx + 1]!;
}

function JobCard({ job }: { job: JobRow }) {
  const [isPending, startTransition] = useTransition();
  const next = nextStatus(job.status);
  const dueDate = job.dueDate ? new Date(job.dueDate) : null;
  const isOverdue = dueDate && dueDate < new Date();

  return (
    <Card className="border-border">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-medium text-muted-foreground">{job.jobNumber}</p>
            <p className="text-sm font-semibold">{job.sku.code}</p>
            <p className="text-xs text-muted-foreground">{job.sku.name}</p>
          </div>
          <Badge variant="secondary" className="shrink-0 text-[10px]">x{job.quantity}</Badge>
        </div>

        {job.client && (
          <p className="text-xs text-muted-foreground">{job.client.name}{job.client.company ? ` (${job.client.company})` : ""}</p>
        )}

        {dueDate && (
          <div className={`flex items-center gap-1 text-xs ${isOverdue ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
            <Calendar className="h-3 w-3" />
            {dueDate.toLocaleDateString()}{isOverdue ? " (overdue)" : ""}
          </div>
        )}

        {next && (
          <Button
            size="sm"
            variant="outline"
            className="w-full gap-1.5 text-xs"
            disabled={isPending}
            onClick={() => startTransition(async () => { await updateJobStatusAction(job.id, next as never); })}
          >
            <ArrowRight className="h-3 w-3" /> Move to {STATUS_LABELS[next]}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function JobKanban({ columns }: JobKanbanProps) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
      {STATUS_ORDER.map((status) => {
        const jobs = columns[status] ?? [];
        return (
          <div key={status} className="space-y-2">
            <div className={`rounded-lg border px-3 py-2 text-center text-xs font-semibold ${STATUS_COLORS[status]}`}>
              {STATUS_LABELS[status]} <span className="ml-1 opacity-60">({jobs.length})</span>
            </div>
            <div className="space-y-2">
              {jobs.map((job) => <JobCard key={job.id} job={job} />)}
              {jobs.length === 0 && (
                <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-border">
                  <Package className="h-4 w-4 text-muted-foreground/40" />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
