import { notFound } from "next/navigation";

import { PageHeader } from "@/components/app-shell/page-header";
import { requireSession } from "@/lib/auth/session";
import { getCampaign } from "@/lib/services/marketing-service";
import { CampaignBuilder } from "@/components/marketing/campaign-builder";

export const dynamic = "force-dynamic";

export default async function EditCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSession();
  const { id } = await params;
  const campaign = await getCampaign(id);

  if (!campaign) notFound();

  if (campaign.status !== "DRAFT") {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        helpKey="campaigns-edit"
        eyebrow="Marketing"
        title={`Edit: ${campaign.name}`}
        description="Modify campaign settings and content."
      />
      <CampaignBuilder
        initial={{
          id: campaign.id,
          name: campaign.name,
          subject: campaign.subject,
          bodyHtml: campaign.bodyHtml,
          segmentType: campaign.segmentType,
          segmentConfig: campaign.segmentConfig ?? "",
          recipientCount: campaign.recipientCount,
        }}
      />
    </div>
  );
}
