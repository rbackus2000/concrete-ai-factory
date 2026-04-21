import { notFound } from "next/navigation";

import { PageHeader } from "@/components/app-shell/page-header";
import { requireSession } from "@/lib/auth/session";
import { getSequence } from "@/lib/services/marketing-service";
import { SequenceBuilder } from "@/components/marketing/sequence-builder";

export const dynamic = "force-dynamic";

export default async function EditSequencePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSession();
  const { id } = await params;
  const sequence = await getSequence(id);

  if (!sequence) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        helpKey="sequences-edit"
        eyebrow="Marketing"
        title={`Edit: ${sequence.name}`}
        description="Modify sequence settings and email steps."
      />
      <SequenceBuilder
        initial={{
          id: sequence.id,
          name: sequence.name,
          description: sequence.description ?? "",
          trigger: sequence.trigger,
          isActive: sequence.isActive,
          steps: sequence.steps.map((s) => ({
            stepNumber: s.stepNumber,
            delayDays: s.delayDays,
            subject: s.subject,
            bodyHtml: s.bodyHtml,
            tone: s.tone ?? "friendly",
            sentCount: s.sentCount,
            openCount: s.openCount,
            clickCount: s.clickCount,
          })),
        }}
      />
    </div>
  );
}
