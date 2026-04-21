import { PageHeader } from "@/components/app-shell/page-header";
import { requireSession } from "@/lib/auth/session";
import { CampaignBuilder } from "@/components/marketing/campaign-builder";

export const dynamic = "force-dynamic";

export default async function NewCampaignPage() {
  await requireSession();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Marketing"
        title="New Campaign"
        description="Create a one-time broadcast email to a segment of contacts."
      />
      <CampaignBuilder />
    </div>
  );
}
