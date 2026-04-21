import { PageHeader } from "@/components/app-shell/page-header";
import { ProposalGeneratorForm } from "@/components/slat-wall/proposal-generator-form";
import { getNextProposalNumber } from "@/app/actions/proposal-actions";

export const dynamic = "force-dynamic";

export default async function NewProposalPage() {
  const nextNumber = await getNextProposalNumber();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Slat Walls"
        title="Generate Client Proposal"
        description="Build a premium 16-page PDF proposal for the SW-01 Rotating Slat Wall Installation System."
        helpKey="slat-walls-proposal"
      />
      <ProposalGeneratorForm nextProposalNumber={nextNumber} />
    </div>
  );
}
