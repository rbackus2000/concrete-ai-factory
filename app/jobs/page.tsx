import Link from "next/link";

import { PageHeader } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import JobKanban from "@/components/jobs/job-kanban";
import { getJobsByStatus } from "@/lib/services/job-service";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  const columns = await getJobsByStatus();

  const serialized = Object.fromEntries(
    Object.entries(columns).map(([status, jobs]) => [
      status,
      jobs.map((j) => ({
        id: j.id,
        jobNumber: j.jobNumber,
        quantity: j.quantity,
        status: j.status,
        dueDate: j.dueDate?.toISOString() ?? null,
        sku: j.sku,
        client: j.client,
      })),
    ]),
  );

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          eyebrow="Jobs"
          title="Job Tracking"
          description="Track production jobs from quote to delivery."
        />
        <Link href="/jobs/new">
          <Button>Create Job</Button>
        </Link>
      </div>
      <JobKanban columns={serialized} />
    </div>
  );
}
