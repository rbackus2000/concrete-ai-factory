import { PageHeader } from "@/components/app-shell/page-header";
import JobForm from "@/components/forms/job-form";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function NewJobPage() {
  const [skus, clients] = await Promise.all([
    prisma.sku.findMany({ where: { status: "ACTIVE" }, orderBy: { code: "asc" }, select: { code: true, name: true } }),
    prisma.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, company: true } }),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Jobs" title="Create New Job" description="Start a new production job for a SKU." />
      <JobForm skuOptions={skus} clientOptions={clients} />
    </div>
  );
}
