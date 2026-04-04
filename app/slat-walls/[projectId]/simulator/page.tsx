import { notFound } from "next/navigation";

import { PageHeader } from "@/components/app-shell/page-header";
import { SlatWallSimulator } from "@/components/slat-wall/slat-wall-simulator";
import { getSlatWallDetail, getSlatWallSimulatorImages } from "@/lib/services/slat-wall-service";

export const dynamic = "force-dynamic";

type SimulatorPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function SimulatorPage({ params }: SimulatorPageProps) {
  const { projectId } = await params;
  const [detail, savedImages] = await Promise.all([
    getSlatWallDetail(projectId),
    getSlatWallSimulatorImages(projectId),
  ]);

  if (!detail || !detail.config) {
    notFound();
  }

  const { project, config } = detail;
  const wallWidthFt = Number(
    ((config.totalSlatCount * (config.slatWidth + config.slatSpacing)) / 12).toFixed(1),
  );

  const initialImages: Record<string, string> = {};
  for (const [state, data] of Object.entries(savedImages)) {
    initialImages[state] = data.imageUrl;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Slat Walls"
        title={`${project.code} — Simulator`}
        description="Interactive rotating slat wall visualization with horizontal line density rendering and three-state optical reveal."
      />
      <SlatWallSimulator
        projectId={projectId}
        slatCount={config.totalSlatCount}
        slatWidth={config.slatWidth}
        wallWidthFt={wallWidthFt}
        projectCode={project.code}
        initialAiImages={initialImages}
      />
    </div>
  );
}
