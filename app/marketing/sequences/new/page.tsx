import { PageHeader } from "@/components/app-shell/page-header";
import { requireSession } from "@/lib/auth/session";
import { SequenceBuilder } from "@/components/marketing/sequence-builder";

export const dynamic = "force-dynamic";

export default async function NewSequencePage() {
  await requireSession();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Marketing"
        title="New Sequence"
        description="Create an automated email sequence triggered by customer actions."
      />
      <SequenceBuilder />
    </div>
  );
}
