import { PageHeader } from "@/components/app-shell/page-header";
import { requireSession } from "@/lib/auth/session";
import { getPipelineData } from "@/lib/services/contact-service";
import { getExceptionOrderContactIds } from "@/lib/services/order-service";
import { PipelineBoard } from "@/components/contacts/pipeline-board";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  await requireSession();
  const [pipeline, exceptionContactIds] = await Promise.all([
    getPipelineData(),
    getExceptionOrderContactIds().catch(() => []),
  ]);

  // Serialize dates for client component
  const serialized = pipeline.map((col) => ({
    ...col,
    contacts: col.contacts.map((c) => ({
      ...c,
      lastActivity: c.lastActivity?.toISOString() ?? null,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    })),
  }));

  const totalContacts = pipeline.reduce((sum, col) => sum + col.count, 0);
  const totalValue = pipeline.reduce((sum, col) => sum + col.totalValue, 0);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="CRM"
        title="Pipeline"
        description={`${totalContacts} contacts — $${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} total pipeline value. Drag contacts between stages.`}
      />
      <PipelineBoard pipeline={serialized} exceptionContactIds={exceptionContactIds} />
    </div>
  );
}
