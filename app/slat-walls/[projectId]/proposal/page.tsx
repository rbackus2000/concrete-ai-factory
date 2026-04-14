import { notFound } from "next/navigation";

import { PageHeader } from "@/components/app-shell/page-header";
import { ProposalGeneratorForm } from "@/components/slat-wall/proposal-generator-form";
import { getNextProposalNumber } from "@/app/actions/proposal-actions";
import { getSlatWallDetail, getSlatWallSimulatorImages } from "@/lib/services/slat-wall-service";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ projectId: string }> };

export default async function ProjectProposalPage({ params }: Props) {
  const { projectId } = await params;
  const [detail, savedImages, nextNumber] = await Promise.all([
    getSlatWallDetail(projectId),
    getSlatWallSimulatorImages(projectId),
    getNextProposalNumber(),
  ]);

  if (!detail || !detail.config) notFound();

  const { project, config } = detail;

  // Flatten scenario-grouped images: pick most recent per state across all scenarios
  const aiImages: Record<string, string> = {};
  for (const states of Object.values(savedImages)) {
    for (const [state, data] of Object.entries(states)) {
      if (!aiImages[state]) aiImages[state] = data.imageUrl;
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Slat Walls"
        title={`${project.code} - Generate Proposal`}
        description="Build a premium 16-page PDF proposal for this project's slat wall installation."
      />
      <ProposalGeneratorForm
        nextProposalNumber={nextNumber}
        projectId={projectId}
        projectCode={project.code}
        projectName={project.name}
        clientName={project.clientName}
        defaultSlatCount={config.totalSlatCount}
        defaultSlatWidthIn={config.slatWidth}
        defaultSlatHeightFt={config.slatHeight / 12}
        positionAName={project.positionAName}
        positionBName={project.positionBName}
        aiImages={aiImages}
      />
    </div>
  );
}
