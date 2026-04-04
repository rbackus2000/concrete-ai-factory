import { notFound } from "next/navigation";

import { PageHeader } from "@/components/app-shell/page-header";
import { SlatWallSimulator } from "@/components/slat-wall/slat-wall-simulator";
import { getSlatWallDetail } from "@/lib/services/slat-wall-service";

export const dynamic = "force-dynamic";

type SimulatorPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function SimulatorPage({ params }: SimulatorPageProps) {
  const { projectId } = await params;
  const detail = await getSlatWallDetail(projectId);

  if (!detail || !detail.config) {
    notFound();
  }

  const { project, config } = detail;
  const wallWidthFt = Number(
    ((config.totalSlatCount * (config.slatWidth + config.slatSpacing)) / 12).toFixed(1),
  );

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
      />
    </div>
  );
}
