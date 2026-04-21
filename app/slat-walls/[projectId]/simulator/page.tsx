import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/app-shell/page-header";
import { SlatWallSimulator } from "@/components/slat-wall/slat-wall-simulator";
import { Button } from "@/components/ui/button";
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

  // Build per-scenario image map: { scenarioId: { A: url, B: url, C: url } }
  const initialImages: Record<string, Record<string, string>> = {};
  for (const [scenarioId, states] of Object.entries(savedImages)) {
    initialImages[scenarioId] = {};
    for (const [state, data] of Object.entries(states)) {
      initialImages[scenarioId][state] = data.imageUrl;
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          eyebrow="Slat Walls"
          title={`${project.code} — Simulator`}
          description="Interactive rotating slat wall visualization with horizontal line density rendering and three-state optical reveal."
          helpKey="slat-walls-simulator"
        />
        <Link href={`/slat-walls/${projectId}`}>
          <Button variant="outline">Back to Project</Button>
        </Link>
      </div>
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
